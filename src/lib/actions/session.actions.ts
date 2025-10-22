// src/lib/actions/session.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { pusherServer } from '../pusher/server';

export async function createCoursSession(professeurId: string, studentIds: string[]) {
    console.log(`[ACTION] - createCoursSession appelée pour le prof ${professeurId} avec les élèves:`, studentIds);
    
    const sessionId = `session-${Math.random().toString(36).substring(7)}`;
    const classroomId = 'classe-a'; // Dummy classroom for broadcast

    console.log(`[ACTION] - ID de session généré: ${sessionId}. Déclenchement de Pusher...`);
    // The frontend expects this to be awaited, but in a real scenario,
    // this would be a "fire and forget" and we wouldn't block for it.
    await pusherServer.trigger(`presence-classe-${classroomId}`, 'session-started', {
        sessionId: sessionId,
        invitedStudentIds: studentIds,
    });
    console.log('[ACTION] - Événement Pusher "session-started" envoyé.');
    
    studentIds.forEach(id => {
        revalidatePath(`/student/${id}`);
    });
    
    console.log('[ACTION] - Retourne l\'objet session.');
    return { id: sessionId, professeurId, classroomId };
}

export async function getSessionDetails(sessionId: string) {
    // DUMMY DATA
    console.log(`[DUMMY] Getting session details for ${sessionId}`);
    return {
        id: sessionId,
        participants: [],
        professeur: { id: 'teacher-id', name: 'Professeur Test' },
    };
}

export async function spotlightParticipant(sessionId: string, participantId: string) {
    // DUMMY ACTION
    console.log(`[DUMMY] Spotlighting participant ${participantId} in session ${sessionId}`);
    const channelName = `presence-session-${sessionId}`;
    await pusherServer.trigger(channelName, 'participant-spotlighted', { participantId });
    revalidatePath(`/session/${sessionId}`);
}

export async function endCoursSession(sessionId: string) {
    // DUMMY ACTION
    console.log(`[DUMMY] Ending session ${sessionId}`);
    const channelName = `presence-session-${sessionId}`;
    await pusherServer.trigger(channelName, 'session-ended', { sessionId });
    // Also notify on a dummy class channel
    await pusherServer.trigger('presence-classe-classe-a', 'session-ended', { sessionId });

    return { id: sessionId, endedAt: new Date() };
}

export async function serverSpotlightParticipant(sessionId: string, participantId: string) {
    // DUMMY ACTION (forwarder)
    await spotlightParticipant(sessionId, participantId);
}

export async function broadcastTimerEvent(sessionId: string, event: string, data?: any) {
    // DUMMY ACTION
    console.log(`[DUMMY] Broadcasting timer event ${event} for session ${sessionId}`);
    const channel = `presence-session-${sessionId}`;
    await pusherServer.trigger(channel, event, data || {});
}
