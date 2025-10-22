// src/lib/actions/conversation.actions.ts
'use server';

import { pusherServer } from '@/lib/pusher/server';
import { FullConversation } from '@/lib/types';


export async function getOrCreateConversation(
  initiatorId: string,
  receiverId: string
): Promise<FullConversation> {
  // DUMMY DATA
  console.log(`[DUMMY] Getting or creating conversation between ${initiatorId} and ${receiverId}`);

  return {
    id: `conv-${initiatorId}-${receiverId}`,
    initiatorId: initiatorId,
    receiverId: receiverId,
    createdAt: new Date(),
    updatedAt: new Date(),
    messages: [
      { 
        id: 'msg1', 
        message: 'Bonjour ! Ceci est une conversation de test.', 
        senderId: initiatorId, 
        senderName: 'Utilisateur Initiateur', 
        createdAt: new Date(), 
        conversationId: `conv-${initiatorId}-${receiverId}`,
        classroomId: null,
        isQuestion: null,
        directMessageSenderId: null,
      }
    ],
    initiator: { id: initiatorId, name: 'Utilisateur Initiateur' },
    receiver: { id: receiverId, name: 'Utilisateur Destinataire' },
  };
}


export async function sendDirectMessage(formData: FormData) {
    // DUMMY ACTION
    const messageContent = formData.get('message') as string;
    const conversationId = formData.get('conversationId') as string;
    
    console.log(`[DUMMY] Sending DM "${messageContent}" in conversation ${conversationId}`);

    const newMessage = {
        id: `msg-${Math.random()}`,
        message: messageContent,
        conversationId,
        senderId: 'current-user-id', // This would be the session user ID
        senderName: "Vous",
        createdAt: new Date(),
    };

    const channelName = `private-conversation-${conversationId}`;
    await pusherServer.trigger(channelName, 'new-dm', newMessage);

    return newMessage;
}
