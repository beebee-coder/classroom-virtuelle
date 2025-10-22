
// src/lib/actions/session.actions.ts - Version corrigée avec les nouvelles fonctions Pusher
'use server';

import { revalidatePath } from 'next/cache';
import { pusherTrigger } from '../pusher/server';

export async function createCoursSession(professeurId: string, studentIds: string[]) {
    try {
        console.log(`[ACTION] - createCoursSession appelée pour le prof ${professeurId} avec les élèves:`, studentIds);
        
        // Validation des paramètres
        if (!professeurId || !studentIds || !Array.isArray(studentIds)) {
            throw new Error('Paramètres invalides: professeurId et studentIds sont requis');
        }

        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const classroomId = 'classe-a';

        const payload = {
            sessionId: sessionId,
            invitedStudentIds: studentIds,
            professeurId: professeurId,
            timestamp: new Date().toISOString()
        };

        console.log(`[ACTION] - ID de session généré: ${sessionId}. Déclenchement de Pusher...`);
        console.log(`[ACTION] - Envoi de l'événement 'session-started' sur le canal 'presence-classe-${classroomId}' avec le payload:`, payload);

        
        // Appel sécurisé à Pusher avec gestion d'erreur
        const pusherResponse = await pusherTrigger(
            `presence-classe-${classroomId}`, 
            'session-started', 
            payload
        );

        if (pusherResponse.status !== 200) {
            console.error('[ACTION] - Erreur Pusher:', pusherResponse.body);
            throw new Error(`Échec de la diffusion Pusher: ${pusherResponse.body}`);
        }

        console.log('[ACTION] - Événement Pusher "session-started" envoyé avec succès.');
        
        // Revalidation des chemins pour les élèves concernés
        studentIds.forEach(id => {
            revalidatePath(`/student/${id}`);
        });
        
        console.log('[ACTION] - Retourne l\'objet session.');
        return { 
            id: sessionId, 
            professeurId, 
            classroomId,
            success: true 
        };
        
    } catch (error) {
        console.error('[ACTION] - Erreur lors de la création de la session:', error);
        throw new Error(
            error instanceof Error 
                ? `Échec de la création de session: ${error.message}`
                : 'Erreur inconnue lors de la création de session'
        );
    }
}

export async function getSessionDetails(sessionId: string) {
    try {
        if (!sessionId) {
            throw new Error('sessionId est requis');
        }

        console.log(`[SESSION] Getting session details for ${sessionId}`);
        return {
            id: sessionId,
            participants: [],
            professeur: { 
                id: 'teacher-id', 
                name: 'Professeur Test' 
            },
            createdAt: new Date().toISOString()
        };
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
        
        const pusherResponse = await pusherTrigger(
            channelName, 
            'participant-spotlighted', 
            { 
                participantId,
                sessionId,
                timestamp: new Date().toISOString()
            }
        );

        if (pusherResponse.status !== 200) {
            throw new Error(`Échec de la diffusion spotlight: ${pusherResponse.body}`);
        }

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

        console.log(`[SESSION] Ending session ${sessionId}`);
        const channelName = `presence-session-${sessionId}`;
        
        // Notifier la fin de session sur le channel de session
        await pusherTrigger(
            channelName, 
            'session-ended', 
            { 
                sessionId,
                endedAt: new Date().toISOString()
            }
        );

        // Notifier sur le channel de classe
        await pusherTrigger(
            'presence-classe-classe-a', 
            'session-ended', 
            { 
                sessionId,
                endedAt: new Date().toISOString()
            }
        );

        return { 
            id: sessionId, 
            endedAt: new Date(),
            success: true 
        };
        
    } catch (error) {
        console.error('[SESSION] - Erreur lors de la fin de session:', error);
        throw new Error('Impossible de terminer la session');
    }
}

export async function serverSpotlightParticipant(sessionId: string, participantId: string) {
    // Forwarder avec gestion d'erreur
    return await spotlightParticipant(sessionId, participantId);
}

export async function broadcastTimerEvent(sessionId: string, event: string, data?: any) {
    try {
        if (!sessionId || !event) {
            throw new Error('sessionId et event sont requis');
        }

        console.log(`[TIMER] Broadcasting timer event ${event} for session ${sessionId}`);
        const channel = `presence-session-${sessionId}`;
        
        const pusherResponse = await pusherTrigger(
            channel, 
            event, 
            { 
                ...data,
                sessionId,
                timestamp: new Date().toISOString()
            }
        );

        if (pusherResponse.status !== 200) {
            throw new Error(`Échec de la diffusion timer: ${pusherResponse.body}`);
        }

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
