// src/lib/actions/chat.actions.ts
'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { pusherTrigger } from '@/lib/pusher/server';
import prisma from '@/lib/prisma';
import type { Message, Reaction, User } from '@prisma/client';

type ReactionWithUser = Reaction & { user: Pick<User, 'id' | 'name'> };
export type MessageWithReactions = Message & {
    sender: Pick<User, 'id' | 'name' | 'image'>;
    reactions: ReactionWithUser[];
};

export async function getMessages(classroomId: string): Promise<MessageWithReactions[]> {
    console.log(`💬 [ACTION] Récupération des messages pour la classe ${classroomId}.`);
    
    return prisma.message.findMany({
        where: { classroomId },
        include: {
            sender: { select: { id: true, name: true, image: true }},
            reactions: {
                include: {
                    user: { select: { id: true, name: true }}
                }
            }
        },
        orderBy: {
            createdAt: 'asc'
        }
    });
}

export async function sendMessage(formData: FormData): Promise<MessageWithReactions> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error('Unauthorized');
    
    const senderId = session.user.id;
    const messageContent = formData.get('message') as string;
    const classroomId = formData.get('classroomId') as string;
    
    console.log(`💬 [ACTION] Envoi du message "${messageContent}" par ${senderId} à la classe ${classroomId}`);

    const newMessage = await prisma.message.create({
        data: {
            message: messageContent,
            classroomId,
            senderId,
        },
         include: {
            sender: { select: { id: true, name: true, image: true }},
            reactions: {
                include: {
                    user: { select: { id: true, name: true }}
                }
            }
        },
    });

    await pusherTrigger(`presence-classe-${classroomId}`, 'new-message', newMessage);

    return newMessage;
}

export async function toggleReaction(messageId: string, emoji: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error('Unauthorized');
    
    const userId = session.user.id;
    
    console.log(`👍 [ACTION] Ajout/retrait de la réaction ${emoji} sur le message ${messageId} par ${userId}.`);

    const existingReaction = await prisma.reaction.findFirst({
        where: { messageId, userId, emoji }
    });

    const message = await prisma.message.findUnique({ where: { id: messageId }});
    if (!message?.classroomId) throw new Error("Message not found or not in a classroom");
    
    const channelName = `presence-classe-${message.classroomId}`;

    if (existingReaction) {
        await prisma.reaction.delete({ where: { id: existingReaction.id }});
        await pusherTrigger(channelName, 'reaction-update', { messageId, reaction: existingReaction, action: 'removed' });
    } else {
        const newReaction = await prisma.reaction.create({
            data: { messageId, userId, emoji },
            include: { user: { select: { id: true, name: true }}}
        });
        await pusherTrigger(channelName, 'reaction-update', { messageId, reaction: newReaction, action: 'added' });
    }
}

export async function deleteChatHistory(classroomId: string) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'PROFESSEUR') throw new Error('Unauthorized');

    console.log(`🗑️ [ACTION] Effacement de l'historique du chat pour la classe ${classroomId}.`);
    
    await prisma.message.deleteMany({
        where: { classroomId }
    });
    
    await pusherTrigger(`presence-classe-${classroomId}`, 'history-cleared', {});
}
