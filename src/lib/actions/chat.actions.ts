// src/lib/actions/chat.actions.ts
'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from '@/lib/prisma';
import type { Message, Reaction, User } from '@prisma/client';

// Note: Pour une architecture entièrement découplée, les appels `ablyTrigger`
// devraient être remplacés par des appels à `httpAblyTrigger` côté client
// après que l'action serveur a terminé son travail avec la base de données.
// Pour l'instant, nous laissons les triggers serveur pour ne pas casser la logique existante
// en attendant une refactorisation complète du chat.
import { ablyTrigger } from '@/lib/ably/triggers';
import { AblyEvents } from "../ably/events";
import { getClassChannelName } from "../ably/channels";

type ReactionWithUser = Reaction & { user: Pick<User, 'id' | 'name'> };
export type MessageWithReactions = Message & {
    sender: Pick<User, 'id' | 'name' | 'image'>;
    reactions: ReactionWithUser[];
};

export async function getMessages(classroomId: string): Promise<MessageWithReactions[]> {
    try {
        if (!classroomId || typeof classroomId !== 'string') throw new Error('ID de classe invalide');

        const classroom = await prisma.classroom.findUnique({
            where: { id: classroomId },
            select: { id: true }
        });
        if (!classroom) throw new Error('Classe non trouvée');

        const messages = await prisma.message.findMany({
            where: { classroomId },
            include: {
                sender: { select: { id: true, name: true, image: true } },
                reactions: { include: { user: { select: { id: true, name: true } } } }
            },
            orderBy: { createdAt: 'asc' }
        });

        return messages;
    } catch (error) {
        console.error('❌ [CHAT ACTION] Erreur getMessages:', error);
        throw new Error('Impossible de charger les messages');
    }
}

export async function sendMessage(formData: FormData): Promise<{ success: boolean; message?: MessageWithReactions; error?: string }> {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) throw new Error('Non autorisé');
        
        const senderId = session.user.id;
        const messageContent = formData.get('message') as string;
        const classroomId = formData.get('classroomId') as string;

        if (!messageContent?.trim()) throw new Error('Le message ne peut pas être vide');
        if (!classroomId) throw new Error('ID de classe manquant');

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
        if (!userAccess) throw new Error('Accès non autorisé à cette classe');

        const newMessage = await prisma.message.create({
            data: {
                message: messageContent.trim(),
                classroomId,
                senderId,
            },
            include: {
                sender: { select: { id: true, name: true, image: true } },
                reactions: { include: { user: { select: { id: true, name: true } } } }
            },
        });

        await ablyTrigger(getClassChannelName(classroomId), AblyEvents.NEW_MESSAGE, newMessage);

        return { success: true, message: newMessage };
    } catch (error) {
        console.error('❌ [CHAT ACTION] Erreur sendMessage:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
    }
}

export async function toggleReaction(messageId: string, emoji: string): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) throw new Error('Non autorisé');
        
        const userId = session.user.id;
        if (!messageId || !emoji) throw new Error('Données de réaction invalides');

        const message = await prisma.message.findUnique({ 
            where: { id: messageId },
            select: { classroomId: true }
        });
        if (!message || !message.classroomId) throw new Error('Message ou classe non trouvé');

        const channelName = getClassChannelName(message.classroomId);

        const existingReaction = await prisma.reaction.findFirst({
            where: { messageId, userId, emoji }
        });

        if (existingReaction) {
            await prisma.reaction.delete({ where: { id: existingReaction.id } });
            await ablyTrigger(channelName, AblyEvents.REACTION_UPDATE, { 
                messageId, 
                reaction: { ...existingReaction, user: { id: userId, name: session.user.name } }, 
                action: 'removed' 
            });
        } else {
            const newReaction = await prisma.reaction.create({
                data: { messageId, userId, emoji },
                include: { user: { select: { id: true, name: true } } }
            });
            await ablyTrigger(channelName, AblyEvents.REACTION_UPDATE, { 
                messageId, 
                reaction: newReaction, 
                action: 'added' 
            });
        }

        return { success: true };
    } catch (error) {
        console.error('❌ [CHAT ACTION] Erreur toggleReaction:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
    }
}

export async function deleteChatHistory(classroomId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await getServerSession(authOptions);
        if (session?.user?.role !== 'PROFESSEUR') throw new Error('Accès réservé aux professeurs');
        if (!classroomId) throw new Error('ID de classe manquant');
        
        const classroom = await prisma.classroom.findFirst({
            where: { id: classroomId, professeurId: session.user.id },
            select: { id: true }
        });
        if (!classroom) throw new Error('Classe non trouvée ou accès non autorisé');

        await prisma.reaction.deleteMany({ where: { message: { classroomId: classroomId } } });
        await prisma.message.deleteMany({ where: { classroomId } });
        
        await ablyTrigger(getClassChannelName(classroomId), AblyEvents.HISTORY_CLEARED, {});

        return { success: true };
    } catch (error) {
        console.error('❌ [CHAT ACTION] Erreur deleteChatHistory:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
    }
}
