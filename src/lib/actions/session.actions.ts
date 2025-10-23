// src/lib/actions/session.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { pusherTrigger } from '../pusher/server';

export async function createCoursSession(professeurId: string, classroomId: string, studentIds: string[]) {
    try {
        console.log(`🚀 [ACTION] - Démarrage de la création de session pour prof ${professeurId}, classe ${classroomId}`);
        
        if (!professeurId || !classroomId || !studentIds || !Array.isArray(studentIds)) {
            throw new Error('Paramètres invalides: professeurId, classroomId et studentIds sont requis');
        }

        // SIMULATION: Create a fake session ID
        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        console.log(`🆔 [ACTION] - ID de session généré (factice): ${sessionId}`);

        // **NOUVEAU** : Sauvegarder les participants de la session
        const sessionApiRoute = process.env.NEXTAUTH_URL
            ? `${process.env.NEXTAUTH_URL}/api/session/${sessionId}`
            : `http://localhost:3000/api/session/${sessionId}`;
            
        await fetch(sessionApiRoute, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ participants: studentIds }),
        });
        console.log(`[ACTION] - Participants pour la session ${sessionId} sauvegardés via l'API.`);

        const invitationResults = await sendIndividualInvitations(sessionId, professeurId, classroomId, studentIds);

        // Revalidate the path for each invited student
        studentIds.forEach(id => {
            revalidatePath(`/student/${id}`);
        });
        
        console.log('✅ [ACTION] - Création de session terminée avec succès.');
        return { 
            id: sessionId, 
            professeurId, 
            classroomId,
            invitationResults,
            success: true 
        };
        
    } catch (error) {
        console.error('💥 [ACTION] - Erreur critique lors de la création de la session:', error);
        throw new Error(
            error instanceof Error 
                ? `Échec de la création de session: ${error.message}`
                : 'Erreur inconnue lors de la création de session'
        );
    }
}

async function sendIndividualInvitations(sessionId: string, professeurId: string, classroomId: string, studentIds: string[]) {
    console.log(`📨 [ACTION - INVITATIONS] - Début de l'envoi pour la session ${sessionId}`);
    const results = {
        successful: [] as string[],
        failed: [] as string[]
    };

    // DUMMY DATA - In a real app, you would fetch this from the database.
    const classroomName = 'Classe de Démo';
    const teacherName = 'Professeur Test';

    const invitationPayload = {
        sessionId: sessionId,
        teacherId: professeurId,
        classroomId: classroomId,
        classroomName: classroomName,
        teacherName: teacherName,
        timestamp: new Date().toISOString(),
        type: 'session-invitation'
    };
    
    console.log('📦 [ACTION - INVITATIONS] - Payload préparé:', invitationPayload);

    // Stocker l'invitation en mémoire (via API route) pour les élèves qui se connectent en retard
    const apiRoute = process.env.NEXTAUTH_URL
      ? `${process.env.NEXTAUTH_URL}/api/session/pending-invitations`
      : 'http://localhost:3000/api/session/pending-invitations';
    
    await fetch(apiRoute, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            event: 'session-invitation',
            data: invitationPayload
        }),
    });
    console.log('📝 [ACTION - INVITATIONS] - Invitation stockée dans le cache des invitations en attente.');

    for (const studentId of studentIds) {
        const channelName = `private-user-${studentId}`;
        try {
            console.log(`📡 [ACTION - INVITATIONS] - Envoi à ${studentId} sur le canal ${channelName}`);
            await pusherTrigger(
                channelName, 
                'session-invitation', 
                invitationPayload
            );
            results.successful.push(studentId);
            console.log(`✅ [ACTION - INVITATIONS] - Succès de l'envoi pour ${studentId}.`);
        } catch (error) {
            console.error(`❌ [ACTION - INVITATIONS] - Échec de l'envoi pour ${studentId}:`, error);
            results.failed.push(studentId);
        }
    }

    console.log(`📊 [ACTION - INVITATIONS] - Résumé: ${results.successful.length} succès, ${results.failed.length} échecs.`);
    return results;
}


export async function getSessionDetails(sessionId: string) {
    try {
        if (!sessionId) {
            throw new Error('sessionId est requis');
        }

        const sessionApiUrl = process.env.NEXTAUTH_URL
            ? `${process.env.NEXTAUTH_URL}/api/session/${sessionId}`
            : `http://localhost:3000/api/session/${sessionId}`;

        const response = await fetch(sessionApiUrl);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch session details: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('[SESSION] - Erreur lors de la récupération des détails:', error);
        throw new Error('Impossible de récupérer les détails de la session');
    }
}

export async function spotlightParticipant(sessionId: string, participantId: string) {
    try {
        if (!sessionId || !participantId) {
            throw new Error('sessionId et participantId sont requis');
        }

        console.log(`[SPOTLIGHT] Spotlighting participant ${participantId} in session ${sessionId}`);
        const channelName = `presence-session-${sessionId}`;
        
        await pusherTrigger(
            channelName, 
            'participant-spotlighted', 
            { 
                participantId,
                sessionId,
                timestamp: new Date().toISOString()
            }
        );

        revalidatePath(`/session/${sessionId}`);
        return { success: true, participantId, sessionId };
        
    } catch (error) {
        console.error('[SPOTLIGHT] - Erreur:', error);
        throw new Error(
            error instanceof Error 
                ? `Échec du spotlight: ${error.message}`
                : 'Erreur inconnue lors du spotlight'
        );
    }
}

export async function endCoursSession(sessionId: string) {
    try {
        if (!sessionId) {
            throw new Error('sessionId est requis');
        }
        console.log(`🔚 [ACTION] - Fin de la session ${sessionId}`);

        // ---=== BYPASS: Données factices ===---
        const sessionDetails = { classroomId: 'classe-a' }; 
        const classroomId = sessionDetails.classroomId;
        // ---===================================---

        if (!classroomId) {
            throw new Error("Impossible de trouver la classe associée à la session.");
        }

        const eventData = { 
            sessionId,
            endedAt: new Date().toISOString()
        };
        
        console.log(`📡 [ACTION] - Envoi de 'session-ended' au canal de session: presence-session-${sessionId}`);
        await pusherTrigger(`presence-session-${sessionId}`, 'session-ended', eventData);
        
        console.log(`📡 [ACTION] - Envoi de 'session-ended' au canal de classe: presence-classe-${classroomId}`);
        await pusherTrigger(`presence-classe-${classroomId}`, 'session-ended', eventData);

        return { 
            id: sessionId, 
            success: true 
        };
        
    } catch (error) {
        console.error('💥 [ACTION] - Erreur lors de la fin de session:', error);
        throw new Error('Impossible de terminer la session');
    }
}


export async function serverSpotlightParticipant(sessionId: string, participantId: string) {
    return await spotlightParticipant(sessionId, participantId);
}

export async function broadcastTimerEvent(sessionId: string, event: string, data?: any) {
    try {
        if (!sessionId || !event) {
            throw new Error('sessionId et event sont requis');
        }

        console.log(`[TIMER] Broadcasting timer event ${event} for session ${sessionId}`);
        const channel = `presence-session-${sessionId}`;
        
        await pusherTrigger(
            channel, 
            event, 
            { 
                ...data,
                sessionId,
                timestamp: new Date().toISOString()
            }
        );

        return { success: true, event, sessionId };
        
    } catch (error) {
        console.error('[TIMER] - Erreur:', error);
        throw new Error(
            error instanceof Error 
                ? `Échec de la diffusion timer: ${error.message}`
                : 'Erreur inconnue lors de la diffusion timer'
        );
    }
}

// Types pour TypeScript
export interface SessionData {
    id: string;
    professeurId: string;
    classroomId: string;
    invitationResults?: {
        successful: string[];
        failed: string[];
    };
    success?: boolean;
}

export interface SessionDetails {
    id: string;
    participants: any[];
    professeur: {
        id: string;
        name: string;
    };
    createdAt: string;
}
