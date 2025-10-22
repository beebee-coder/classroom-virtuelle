// src/lib/actions/chat.actions.ts
'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { pusherServer } from '@/lib/pusher/server';
import { getAuthSession } from '@/lib/session';
import { ReactionWithUser, MessageWithReactions } from '../types';
import type { Session, User } from 'next-auth';


export async function getMessages(classroomId: string): Promise<MessageWithReactions[]> {
    const session = await getAuthSession();
    if (!session?.user) {
        throw new Error("Unauthorized to fetch messages.");
    }

    if (!classroomId) {
        throw new Error('Classe ID is required.');
    }
    
    // Security check: ensure the user is part of the class they are trying to view messages from.
    if ((session.user as User).role === 'PROFESSEUR') {
        const classroom = await prisma.classroom.findFirst({
            where: { id: classroomId, professeurId: session.user.id }
        });
        if (!classroom) throw new Error("Unauthorized: Teacher does not teach this class.");
    } else if ((session.user as User).role === 'ELEVE') {
        const user = await prisma.user.findFirst({
            where: { id: session.user.id, classroomId: classroomId }
        });
        if (!user) throw new Error("Unauthorized: Student does not belong to this class.");
    } else {
        throw new Error("Unauthorized: User role is not recognized.");
    }

    const messages = await prisma.message.findMany({
        where: { classroomId },
        include: { 
            reactions: {
                include: {
                    user: { select: { id: true, name: true }}
                }
            } 
        },
        orderBy: { createdAt: 'asc' }
    });
    return messages;
}

export async function sendMessage(formData: FormData) {
    const session = await getAuthSession();
    const messageContent = formData.get('message') as string;
    const classroomId = formData.get('classroomId') as string;
    
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }
    if (!messageContent || !classroomId) {
        throw new Error("Message and classe ID are required.");
    }

    const newMessage = await prisma.message.create({
        data: {
            message: messageContent,
            classroomId,
            senderId: session.user.id,
            senderName: session.user.name ?? "Utilisateur",
        },
        include: {
            reactions: {
                include: {
                    user: { select: { id: true, name: true }}
                }
            }
        }
    });

    await pusherServer.trigger(`presence-classe-${classroomId}`, 'new-message', newMessage);

    return newMessage;
}

export async function toggleReaction(messageId: string, emoji: string) {
    const session = await getAuthSession();
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    const existingReaction = await prisma.reaction.findFirst({
        where: {
            messageId,
            userId: session.user.id,
            emoji
        }
    });
    
    const message = await prisma.message.findUnique({ where: { id: messageId }});
    if (!message || !message.classroomId) throw new Error("Message not found");

    if (existingReaction) {
        await prisma.reaction.delete({ where: { id: existingReaction.id }});
        
        const reactionData: ReactionWithUser = { ...existingReaction, user: { id: session.user.id, name: session.user.name ?? null } };
        await pusherServer.trigger(`presence-classe-${message.classroomId}`, 'reaction-update', { messageId, reaction: reactionData, action: 'removed' });

    } else {
        const newReaction = await prisma.reaction.create({
            data: {
                messageId,
                userId: session.user.id,
                emoji,
            },
            include: {
                user: { select: { id: true, name: true }}
            }
        });
        await pusherServer.trigger(`presence-classe-${message.classroomId}`, 'reaction-update', { messageId, reaction: newReaction, action: 'added' });
    }

    revalidatePath(`/teacher`); // Or a more specific path if needed
}

export async function deleteChatHistory(classroomId: string) {
    const session = await getAuthSession();
    if (!session?.user) {
      throw new Error('Unauthorized');
    }
    
    if ((session.user as User).role !== 'PROFESSEUR') {
      throw new Error('Unauthorized');
    }
  
    const classroom = await prisma.classroom.findFirst({
      where: {
        id: classroomId,
        professeurId: session.user.id,
      },
    });
  
    if (!classroom) {
      throw new Error('Unauthorized or class not found');
    }
  
    await prisma.message.deleteMany({
      where: {
        classroomId: classroomId,
      },
    });

    await pusherServer.trigger(`presence-classe-${classroomId}`, 'history-cleared', {});
  
    revalidatePath(`/teacher/class/${classroomId}`);
  }
