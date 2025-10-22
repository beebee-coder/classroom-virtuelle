// src/lib/actions/chat.actions.ts
'use server';

import { pusherServer } from '@/lib/pusher/server';
import { ReactionWithUser, MessageWithReactions } from '../types';

// ---=== BYPASS BACKEND ===---
const dummyMessages: MessageWithReactions[] = [
    { 
        id: '1', 
        message: 'Bonjour la classe ! Ceci est un message de test.', 
        senderId: 'teacher-id', 
        classroomId: 'classe-a', 
        createdAt: new Date(Date.now() - 60000), 
        updatedAt: new Date(Date.now() - 60000),
        isQuestion: false, 
        conversationId: null, 
        directMessageSenderId: null,
        sender: {
            id: 'teacher-id',
            name: 'Professeur Test',
            image: null,
        },
        reactions: [],
    },
    { 
        id: '2', 
        message: 'Bonjour Monsieur !', 
        senderId: 'student1', 
        classroomId: 'classe-a', 
        createdAt: new Date(Date.now() - 30000), 
        updatedAt: new Date(Date.now() - 30000),
        isQuestion: false, 
        conversationId: null, 
        directMessageSenderId: null,
        sender: {
            id: 'student1',
            name: 'Alice',
            image: null,
        },
        reactions: [{ 
            id: 'r1', 
            emoji: '👍', 
            userId: 'teacher-id', 
            messageId: '2', 
            user: { id: 'teacher-id', name: 'Professeur Test'} 
        }],
    },
];

export async function getMessages(classroomId: string): Promise<MessageWithReactions[]> {
    console.log(`💬 [BYPASS] Récupération des messages pour la classe ${classroomId} (factice).`);
    return dummyMessages;
}

export async function sendMessage(formData: FormData) {
    const messageContent = formData.get('message') as string;
    const classroomId = formData.get('classroomId') as string;
    
    console.log(`💬 [BYPASS] Envoi du message (factice) "${messageContent}" à la classe ${classroomId}`);

    const newMessage: MessageWithReactions = {
        id: `msg-${Date.now()}`,
        message: messageContent,
        classroomId,
        senderId: 'current-user-id', // En mode bypass, l'ID est générique
        createdAt: new Date(),
        updatedAt: new Date(),
        isQuestion: false,
        conversationId: null,
        directMessageSenderId: null,
        sender: {
            id: 'current-user-id',
            name: "Vous (Démo)",
            image: null
        },
        reactions: [],
    };

    console.log('📡 [PUSHER] Déclenchement de "new-message" avec:', newMessage);
    await pusherServer.trigger(`presence-classe-${classroomId}`, 'new-message', newMessage);

    return newMessage;
}

export async function toggleReaction(messageId: string, emoji: string) {
    const classroomId = 'classe-a'; // Dummy classroom for broadcast
    console.log(`👍 [BYPASS] Ajout/retrait de la réaction ${emoji} sur le message ${messageId} (factice).`);

    const reactionData: ReactionWithUser = { 
        id: `react-${Date.now()}`, 
        emoji, 
        userId: 'current-user-id', // ID générique
        messageId,
        user: { id: 'current-user-id', name: 'Vous (Démo)' } 
    };

    // Pour la démo, on simule toujours un ajout. Le client gère l'état visuel.
    console.log('📡 [PUSHER] Déclenchement de "reaction-update" avec:', { messageId, reaction: reactionData, action: 'added' });
    await pusherServer.trigger(`presence-classe-${classroomId}`, 'reaction-update', { messageId, reaction: reactionData, action: 'added' });
}

export async function deleteChatHistory(classroomId: string) {
    console.log(`🗑️ [BYPASS] Effacement de l'historique du chat pour la classe ${classroomId} (factice).`);
    
    console.log('📡 [PUSHER] Déclenchement de "history-cleared".');
    await pusherServer.trigger(`presence-classe-${classroomId}`, 'history-cleared', {});
}
// ---=========================---
