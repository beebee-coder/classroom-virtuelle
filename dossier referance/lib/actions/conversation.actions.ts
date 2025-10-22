// src/lib/actions/conversation.actions.ts
'use server';

import prisma from '@/lib/prisma';
import { getAuthSession } from '@/lib/session';
import { pusherServer } from '@/lib/pusher/server';
import { revalidatePath } from 'next/cache';

export async function getOrCreateConversation(
  initiatorId: string,
  receiverId: string
) {
  if (initiatorId === receiverId) {
    throw new Error('Cannot create conversation with self');
  }

  // Check if a conversation already exists between these two users
  let conversation = await prisma.conversation.findFirst({
    where: {
      OR: [
        { initiatorId: initiatorId, receiverId: receiverId },
        { initiatorId: receiverId, receiverId: initiatorId },
      ],
    },
    include: {
        messages: {
            orderBy: {
                createdAt: 'asc'
            }
        },
        initiator: { select: { name: true, id: true }},
        receiver: { select: { name: true, id: true }},
    }
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        initiatorId,
        receiverId,
      },
      include: {
        messages: true,
        initiator: { select: { name: true, id: true }},
        receiver: { select: { name: true, id: true }},
      }
    });
  }

  return conversation;
}


export async function sendDirectMessage(formData: FormData) {
    const session = await getAuthSession();
    const messageContent = formData.get('message') as string;
    const conversationId = formData.get('conversationId') as string;
    
    if (!session?.user) throw new Error("Unauthorized");
    if (!messageContent || !conversationId) throw new Error("Message and conversation ID are required.");

    const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId }
    });

    if (!conversation) throw new Error("Conversation not found");

    // Ensure sender is part of the conversation
    if (session.user.id !== conversation.initiatorId && session.user.id !== conversation.receiverId) {
        throw new Error("Unauthorized to send message in this conversation");
    }

    const newMessage = await prisma.message.create({
        data: {
            message: messageContent,
            conversationId,
            senderId: session.user.id,
            senderName: session.user.name ?? "Utilisateur",
        },
    });

    const channelName = `private-conversation-${conversationId}`;
    await pusherServer.trigger(channelName, 'new-dm', newMessage);

    return newMessage;
}
