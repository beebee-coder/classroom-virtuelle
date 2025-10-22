// src/lib/actions/session.actions.ts - Version finale avec gestion améliorée
'use server';

import { revalidatePath } from 'next/cache';
import { pusherTrigger } from '../pusher/server';

export async function createCoursSession(professeurId: string, classroomId: string, studentIds: string[]) {
    try {
        console.log(`[ACTION] - createCoursSession appelée pour le prof ${professeurId}, classe ${classroomId} avec les élèves:`, studentIds);
        
        if (!professeurId || !classroomId || !studentIds || !Array.isArray(studentIds)) {
            throw new Error('Paramètres invalides: professeurId, classroomId et studentIds sont requis');
        }

        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        console.log(`[ACTION] - ID de session généré: ${sessionId}`);

        console.log(`[ACTION] - Envoi des invitations individuelles à ${studentIds.length} élève(s)...`);
        const invitationResults = await sendIndividualInvitations(sessionId, professeurId, classroomId, studentIds);

        console.log(`[ACTION] - Notification sur le canal de classe...`);
        await notifyClassroom(sessionId, professeurId, classroomId, studentIds);
        
        studentIds.forEach(id => {
            revalidatePath(`/student/${id}`);
        });
        
        console.log('[ACTION] - Création de session terminée avec succès');
        return { 
            id: sessionId, 
            professeurId, 
            classroomId,
            invitationResults,
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

async function sendIndividualInvitations(sessionId: string, professeurId: string, classroomId: string, studentIds: string[]) {
    const results = {
        successful: [] as string[],
        failed: [] as string[]
    };

    const invitationPayload = {
        sessionId: sessionId,
        teacherId: professeurId,
        classroomId: classroomId,
        classroomName: 'Classe 6ème A', // À récupérer de la base de données
        teacherName: 'Professeur Test', // À récupérer de la base de données
        timestamp: new Date().toISOString(),
        type: 'session-invitation'
    };

    // D'abord, on stocke toutes les invitations
    await fetch(`${process.env.NEXTAUTH_URL}/api/session/pending-invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            event: 'session-invitation',
            data: invitationPayload
        }),
    });

    for (const studentId of studentIds) {
        try {
            console.log(`[ACTION] - Envoi d'invitation à l'élève ${studentId}`);
            
            const pusherResponse = await pusherTrigger(
                `private-user-${studentId}`, 
                'session-invitation', 
                invitationPayload
            );

            if (pusherResponse.status === 200) {
                console.log(`[ACTION] - Invitation envoyée avec succès à l'élève ${studentId}`);
                results.successful.push(studentId);
            } else {
                console.warn(`[ACTION] - Échec de l'invitation pour l'élève ${studentId}:`, pusherResponse.body);
                results.failed.push(studentId);
            }
        } catch (error) {
            console.error(`[ACTION] - Erreur lors de l'envoi de l'invitation à ${studentId}:`, error);
            results.failed.push(studentId);
        }
    }

    console.log(`[ACTION] - Résumé des invitations: ${results.successful.length} succès, ${results.failed.length} échecs`);
    return results;
}

async function notifyClassroom(sessionId: string, professeurId: string, classroomId: string, studentIds: string[]) {
    try {
        const classPayload = {
            sessionId: sessionId,
            invitedStudentIds: studentIds,
            professeurId: professeurId,
            timestamp: new Date().toISOString(),
            type: 'session-created'
        };

        const classPusherResponse = await pusherTrigger(
            `presence-classe-${classroomId}`, 
            'session-created', 
            classPayload
        );

        if (classPusherResponse.status === 200) {
            console.log('[ACTION] - Notification de classe envoyée avec succès');
        } else {
            console.warn('[ACTION] - Échec de la notification de classe:', classPusherResponse.body);
        }
    } catch (error) {
        console.error('[ACTION] - Erreur lors de la notification de classe:', error);
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
