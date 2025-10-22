// src/lib/actions/chat.actions.ts
'use server';

import { pusherServer } from '@/lib/pusher/server';
import { ReactionWithUser, MessageWithReactions } from '../types';

const dummyMessages: MessageWithReactions[] = [
    { id: '1', message: 'Bonjour la classe !', senderId: 'teacher-id', senderName: 'Professeur Test', classroomId: 'classe-a', createdAt: new Date(Date.now() - 60000), reactions: [], isQuestion: false, conversationId: null, directMessageSenderId: null, },
    { id: '2', message: 'Bonjour Monsieur !', senderId: 'student1', senderName: 'Alice', classroomId: 'classe-a', createdAt: new Date(Date.now() - 30000), reactions: [{ id: 'r1', emoji: '👍', userId: 'teacher-id', messageId: '2', user: { id: 'teacher-id', name: 'Professeur Test'} }], isQuestion: false, conversationId: null, directMessageSenderId: null, },
];

export async function getMessages(classroomId: string): Promise<MessageWithReactions[]> {
    // DUMMY DATA
    console.log(`[DUMMY] Getting messages for classroom ${classroomId}`);
    return dummyMessages;
}

export async function sendMessage(formData: FormData) {
    // DUMMY ACTION
    const messageContent = formData.get('message') as string;
    const classroomId = formData.get('classroomId') as string;
    
    console.log(`[DUMMY] Sending message "${messageContent}" to classroom ${classroomId}`);

    const newMessage: MessageWithReactions = {
        id: `msg-${Math.random()}`,
        message: messageContent,
        classroomId,
        senderId: 'current-user-id', // This would be the session user ID
        senderName: "Vous",
        createdAt: new Date(),
        reactions: [],
        isQuestion: false,
        conversationId: null,
        directMessageSenderId: null,
    };

    await pusherServer.trigger(`presence-classe-${classroomId}`, 'new-message', newMessage);

    return newMessage;
}

export async function toggleReaction(messageId: string, emoji: string) {
    // DUMMY ACTION
    console.log(`[DUMMY] Toggling reaction ${emoji} for message ${messageId}`);

    // This is a simplified simulation. In a real app, you'd update the DB.
    // Here we just broadcast an event assuming the client will handle the optimistic update.
    const classroomId = 'classe-a'; // Dummy classroom
    const reactionData: ReactionWithUser = { 
        id: `react-${Math.random()}`, 
        emoji, 
        userId: 'current-user-id',
        messageId,
        user: { id: 'current-user-id', name: 'Vous' } 
    };

    // In a real scenario, you'd check if the reaction exists and send 'added' or 'removed'
    await pusherServer.trigger(`presence-classe-${classroomId}`, 'reaction-update', { messageId, reaction: reactionData, action: 'added' });
}

export async function deleteChatHistory(classroomId: string) {
    // DUMMY ACTION
    console.log(`[DUMMY] Deleting chat history for classroom ${classroomId}`);
    await pusherServer.trigger(`presence-classe-${classroomId}`, 'history-cleared', {});
}
