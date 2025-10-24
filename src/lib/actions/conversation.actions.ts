// src/lib/actions/conversation.actions.ts
'use server';

import { pusherTrigger } from '@/lib/pusher/server';
import type { Conversation, Message, Reaction, User } from '@prisma/client';

type ReactionWithUser = Reaction & { user: Pick<User, 'id' | 'name'> };
export type MessageWithReactions = Message & {
    sender: Pick<User, 'id' | 'name' | 'image'>;
    reactions: ReactionWithUser[];
};

type FullConversation = Conversation & {
  messages: MessageWithReactions[];
  initiator: Pick<User, 'id' | 'name' | 'image'>;
  receiver: Pick<User, 'id' | 'name' | 'image'>;
};


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
        createdAt: new Date(),
        updatedAt: new Date(),
        conversationId: `conv-${initiatorId}-${receiverId}`,
        classroomId: null,
        isQuestion: false,
        directMessageSenderId: null,
        sender: {
          id: initiatorId,
           image: null,
          name: 'Utilisateur Initiateur'
        },
        reactions: [],
      }
    ],
    initiator: { id: initiatorId, name: 'Utilisateur Initiateur', image: null },
    receiver: { id: receiverId, name: 'Utilisateur Destinataire', image: null },
  };
}


export async function sendDirectMessage(formData: FormData) {
    // DUMMY ACTION
    const messageContent = formData.get('message') as string;
    const conversationId = formData.get('conversationId') as string;
    
    console.log(`[DUMMY] Sending DM "${messageContent}" in conversation ${conversationId}`);

    const newMessage: Message = {
        id: `msg-${Math.random()}`,
        message: messageContent,
        conversationId,
        senderId: 'current-user-id', // This would be the session user ID
        createdAt: new Date(),
        updatedAt: new Date(),
        classroomId: null,
        isQuestion: false,
        directMessageSenderId: null,
    };

    const channelName = `private-conversation-${conversationId}`;
    await pusherTrigger(channelName, 'new-dm', newMessage);

    return newMessage;
}
