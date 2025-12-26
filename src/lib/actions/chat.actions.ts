// src/lib/actions/chat.actions.ts
'use server';

import { getAuthSession } from "@/lib/auth";
import { ablyTrigger } from '@/lib/ably/triggers';
import prisma from '@/lib/prisma';
import type { Message, Reaction, User } from '@prisma/client';
import { AblyEvents } from "../ably/events";
import { getClassChannelName } from "../ably/channels";

type ReactionWithUser = Reaction & { user: Pick<User, 'id' | 'name'> };
export type MessageWithReactions = Message & {
    sender: Pick<User, 'id' | 'name' | 'image'>;
    reactions: ReactionWithUser[];
};

export async function getMessages(classroomId: string): Promise<MessageWithReactions[]> {
    console.log(`💬 [ACTION] getMessages pour la classe: ${classroomId}`);
    
    try {
        // Validation de l'ID de classe
        if (!classroomId || typeof classroomId !== 'string') {
            throw new Error('ID de classe invalide');
        }

        // Vérifier que la classe existe
        const classroom = await prisma.classroom.findUnique({
            where: { id: classroomId },
            select: { id: true }
        });

        if (!classroom) {
            console.error(`❌ [ACTION] Classe non trouvée: ${classroomId}`);
            throw new Error('Classe non trouvée');
        }

        const messages = await prisma.message.findMany({
            where: { classroomId },
            include: {
                sender: { 
                    select: { 
                        id: true, 
                        name: true, 
                        image: true 
                    }
                },
                reactions: {
                    include: {
                        user: { 
                            select: { 
                                id: true, 
                                name: true 
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        console.log(`✅ [ACTION] ${messages.length} messages récupérés pour la classe ${classroomId}`);
        return messages;

    } catch (error) {
        console.error(`❌ [ACTION] Erreur lors de la récupération des messages:`, error);
        throw new Error('Impossible de charger les messages');
    }
}

export async function sendMessage(formData: FormData): Promise<{ success: boolean; message?: MessageWithReactions; error?: string }> {
    console.log(`💬 [ACTION] sendMessage`);
    try {
        const session = await getAuthSession();
        if (!session?.user?.id) {
            throw new Error('Non autorisé');
        }
        
        const senderId = session.user.id;
        const messageContent = formData.get('message') as string;
        const classroomId = formData.get('classroomId') as string;

        // Validation des données
        if (!messageContent?.trim()) {
            throw new Error('Le message ne peut pas être vide');
        }

        if (!classroomId) {
            throw new Error('ID de classe manquant');
        }

        console.log(`  -> par ${senderId} à la classe ${classroomId}`);

        const userAccess = await prisma.classroom.findFirst({
            where: {
                id: classroomId,
                OR: [
                    { professeurId: senderId },
                    { eleves: { some: { id: senderId } } }
                ]
            },
            select: { id: true }
        });

        if (!userAccess) {
            throw new Error('Accès non autorisé à cette classe');
        }

        const newMessage = await prisma.message.create({
            data: {
                message: messageContent.trim(),
                classroomId,
                senderId,
            },
            include: {
                sender: { 
                    select: { 
                        id: true, 
                        name: true, 
                        image: true 
                    }
                },
                reactions: {
                    include: {
                        user: { 
                            select: { 
                                id: true, 
                                name: true 
                            }
                        }
                    }
                }
            },
        });

        // Envoyer via Ably
        await ablyTrigger(
            getClassChannelName(classroomId), 
            AblyEvents.NEW_MESSAGE, 
            newMessage
        );

        console.log(`✅ [ACTION] Message envoyé avec succès: ${newMessage.id}`);
        return { success: true, message: newMessage };

    } catch (error) {
        console.error('❌ [ACTION] Erreur lors de l\'envoi du message:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Erreur lors de l\'envoi du message' 
        };
    }
}

export async function toggleReaction(messageId: string, emoji: string): Promise<{ success: boolean; error?: string }> {
    console.log(`👍 [ACTION] toggleReaction pour message: ${messageId}, emoji: ${emoji}`);
    try {
        const session = await getAuthSession();
        if (!session?.user?.id) {
            throw new Error('Non autorisé');
        }
        
        const userId = session.user.id;
        
        console.log(`  -> par ${userId}`);

        // Validation des données
        if (!messageId || !emoji) {
            throw new Error('Données de réaction invalides');
        }

        // Vérifier que le message existe et récupérer son classroomId
        const message = await prisma.message.findUnique({ 
            where: { id: messageId },
            select: { classroomId: true } // Ne sélectionner que le champ nécessaire
        });
        
        if (!message) {
            throw new Error('Message non trouvé');
        }

        const foundClassroomId = message.classroomId;
        if (!foundClassroomId) {
            throw new Error('Message non associé à une classe');
        }
        const channelName = getClassChannelName(foundClassroomId);

        const userAccess = await prisma.classroom.findFirst({
            where: {
                id: foundClassroomId,
                OR: [
                    { professeurId: userId },
                    { eleves: { some: { id: userId } } }
                ]
            },
            select: { id: true }
        });

        if (!userAccess) {
            throw new Error('Accès non autorisé à cette classe');
        }

        const existingReaction = await prisma.reaction.findFirst({
            where: { messageId, userId, emoji }
        });

        if (existingReaction) {
            // Supprimer la réaction existante
            await prisma.reaction.delete({ 
                where: { id: existingReaction.id } 
            });
            
            await ablyTrigger(channelName, AblyEvents.REACTION_UPDATE, { 
                messageId, 
                reaction: { ...existingReaction, user: { id: userId, name: session.user.name } }, 
                action: 'removed' 
            });
            
            console.log(`✅ [ACTION] Réaction retirée: ${emoji}`);
        } else {
            // Ajouter une nouvelle réaction
            const newReaction = await prisma.reaction.create({
                data: { messageId, userId, emoji },
                include: { 
                    user: { 
                        select: { 
                            id: true, 
                            name: true 
                        }
                    }
                }
            });
            
            await ablyTrigger(channelName, AblyEvents.REACTION_UPDATE, { 
                messageId, 
                reaction: newReaction, 
                action: 'added' 
            });
            
            console.log(`✅ [ACTION] Réaction ajoutée: ${emoji}`);
        }

        return { success: true };

    } catch (error) {
        console.error('❌ [ACTION] Erreur lors de la gestion de la réaction:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Erreur lors de la gestion de la réaction' 
        };
    }
}

export async function deleteChatHistory(classroomId: string): Promise<{ success: boolean; error?: string }> {
    console.log(`🗑️ [ACTION] deleteChatHistory pour la classe: ${classroomId}`);
    try {
        const session = await getAuthSession();
        
        // Vérifier les autorisations
        if (session?.user?.role !== 'PROFESSEUR') {
            throw new Error('Accès réservé aux professeurs');
        }

        // Validation de l'ID de classe
        if (!classroomId) {
            throw new Error('ID de classe manquant');
        }
        
        const classroom = await prisma.classroom.findFirst({
            where: { 
                id: classroomId,
                professeurId: session.user.id
            },
            select: { id: true }
        });

        if (!classroom) {
            throw new Error('Classe non trouvée ou accès non autorisé');
        }

        // Supprimer d'abord les réactions (à cause des contraintes de clé étrangère)
        await prisma.reaction.deleteMany({
            where: {
                message: {
                    classroomId: classroomId
                }
            }
        });

        // Puis supprimer les messages
        await prisma.message.deleteMany({
            where: { classroomId }
        });
        
        // Notifier via Ably
        await ablyTrigger(
            getClassChannelName(classroomId), 
            AblyEvents.HISTORY_CLEARED, 
            {}
        );

        console.log(`✅ [ACTION] Historique effacé pour la classe ${classroomId}`);
        return { success: true };

    } catch (error) {
        console.error('❌ [ACTION] Erreur lors de l\'effacement de l\'historique:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Erreur lors de l\'effacement de l\'historique' 
        };
    }
}
