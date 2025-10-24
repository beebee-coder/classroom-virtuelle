// src/lib/actions/session.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { pusherTrigger } from '../pusher/server';
import { getAuthSession } from '../session';
import { ComprehensionLevel } from '@/components/StudentSessionControls';
import { allDummyStudents } from '../dummy-data';
import type { CoursSession } from '@prisma/client';

export async function createCoursSession(professeurId: string, classroomId: string, studentIds: string[]) {
    console.log('🚀 [ACTION SESSION] - Début de la création de la session de cours...');
    try {
        console.log(`  Création pour prof ${professeurId}, classe ${classroomId} avec ${studentIds.length} élève(s).`);
        
        if (!professeurId || !classroomId || !studentIds || !Array.isArray(studentIds)) {
             console.error('❌ [ACTION SESSION] - Paramètres invalides.');
            throw new Error('Paramètres invalides: professeurId, classroomId et studentIds sont requis');
        }

        // SIMULATION: Create a fake session ID
        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        console.log(`  ID de session généré (factice): ${sessionId}`);

        // **NOUVEAU** : Sauvegarder les participants de la session
        const sessionApiRoute = process.env.NEXTAUTH_URL
            ? `${process.env.NEXTAUTH_URL}/api/session/${sessionId}`
            : `/api/session/${sessionId}`;
            
        await fetch(sessionApiRoute, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ participants: studentIds }),
        });
        console.log(`  Participants pour la session ${sessionId} sauvegardés via l'API.`);

        const invitationResults = await sendIndividualInvitations(sessionId, professeurId, classroomId, studentIds);

        // Revalidate the path for each invited student
        studentIds.forEach(id => {
            console.log(`  Revalidation du chemin pour l'élève: /student/${id}`);
            revalidatePath(`/student/${id}`);
        });
        
        console.log('✅ [ACTION SESSION] - Création de session terminée avec succès.');
        return { 
            id: sessionId, 
            professeurId, 
            classroomId,
            invitationResults,
            success: true 
        };
        
    } catch (error) {
        console.error('💥 [ACTION SESSION] - Erreur critique lors de la création:', error);
        throw new Error(
            error instanceof Error 
                ? `Échec de la création de session: ${error.message}`
                : 'Erreur inconnue lors de la création de session'
        );
    }
}

async function sendIndividualInvitations(sessionId: string, professeurId: string, classroomId: string, studentIds: string[]) {
    console.log(`📨 [ACTION INVITATIONS] - Début de l'envoi pour la session ${sessionId}`);
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
    
    console.log('  Payload d\'invitation préparé:', invitationPayload);

    // Stocker l'invitation en mémoire (via API route) pour les élèves qui se connectent en retard
    const apiRoute = process.env.NEXTAUTH_URL
      ? `${process.env.NEXTAUTH_URL}/api/session/pending-invitations`
      : '/api/session/pending-invitations';
    
    await fetch(apiRoute, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            event: 'session-invitation',
            data: invitationPayload
        }),
    });
    console.log('  Invitation stockée dans le cache des invitations en attente.');

    for (const studentId of studentIds) {
        const channelName = `private-user-${studentId}`;
        try {
            console.log(`  -> Envoi à ${studentId} sur le canal ${channelName}`);
            await pusherTrigger(
                channelName, 
                'session-invitation', 
                invitationPayload
            );
            results.successful.push(studentId);
        } catch (error) {
            console.error(`  -> ❌ Échec de l'envoi pour ${studentId}:`, error);
            results.failed.push(studentId);
        }
    }

    console.log(`📊 [ACTION INVITATIONS] - Résumé: ${results.successful.length} succès, ${results.failed.length} échecs.`);
    return results;
}


export async function getSessionDetails(sessionId: string) {
    console.log(`ℹ️ [ACTION SESSION DETAILS] - Récupération des détails pour la session ${sessionId}`);
    try {
        if (!sessionId) {
            console.error('❌ [ACTION SESSION DETAILS] - sessionId est requis.');
            throw new Error('sessionId est requis');
        }

        // Utilisation d'une URL relative pour que l'appel fonctionne quel que soit l'environnement
        const sessionApiUrl = `/api/session/${sessionId}`;

        // En environnement serveur, on doit construire l'URL absolue
        const host = process.env.NEXTAUTH_URL || `http://localhost:${process.env.PORT || 9002}`;
        const absoluteUrl = new URL(sessionApiUrl, host).toString();
        console.log(`  Appel de l'API interne: ${absoluteUrl}`);

        const response = await fetch(absoluteUrl);
        
        if (!response.ok) {
             console.error(`❌ [ACTION SESSION DETAILS] - Échec de la récupération: ${response.statusText}`);
            throw new Error(`Failed to fetch session details: ${response.statusText}`);
        }
        
        const sessionData = await response.json();
        
        // Enrichir les données des élèves
        const enrichedStudents = sessionData.students.map((s: {id: string}) => {
            const fullStudentData = allDummyStudents.find(ds => ds.id === s.id);
            return fullStudentData || s; // Retourner les données complètes si trouvées
        });
        
        console.log('✅ [ACTION SESSION DETAILS] - Détails de session récupérés et enrichis.');
        return { ...sessionData, students: enrichedStudents };
        
    } catch (error) {
        console.error('💥 [ACTION SESSION DETAILS] - Erreur:', error);
        throw new Error('Impossible de récupérer les détails de la session');
    }
}

export async function spotlightParticipant(sessionId: string, participantId: string) {
    console.log(`🌟 [ACTION SPOTLIGHT] - Mise en vedette de ${participantId} dans la session ${sessionId}`);
    try {
        if (!sessionId || !participantId) {
            console.error('❌ [ACTION SPOTLIGHT] - sessionId et participantId sont requis.');
            throw new Error('sessionId et participantId sont requis');
        }
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
        console.log(`  Événement 'participant-spotlighted' diffusé sur ${channelName}.`);

        revalidatePath(`/session/${sessionId}`);
        console.log('✅ [ACTION SPOTLIGHT] - Action terminée avec succès.');
        return { success: true, participantId, sessionId };
        
    } catch (error) {
        console.error('💥 [ACTION SPOTLIGHT] - Erreur:', error);
        throw new Error(
            error instanceof Error 
                ? `Échec du spotlight: ${error.message}`
                : 'Erreur inconnue lors du spotlight'
        );
    }
}

export async function endCoursSession(sessionId: string) {
    console.log(`🔚 [ACTION END SESSION] - Tentative de fin de la session ${sessionId}`);
    try {
        if (!sessionId) {
            console.error('❌ [ACTION END SESSION] - sessionId est requis.');
            throw new Error('sessionId est requis');
        }

        // ---=== BYPASS: Données factices ===---
        const sessionDetails = { classroomId: 'classe-a' }; 
        const classroomId = sessionDetails.classroomId;
        console.log(`  Classe associée (factice): ${classroomId}`);
        // ---===================================---

        if (!classroomId) {
            console.error('❌ [ACTION END SESSION] - Impossible de trouver la classe associée.');
            throw new Error("Impossible de trouver la classe associée à la session.");
        }

        const eventData = { 
            sessionId,
            endedAt: new Date().toISOString()
        };
        
        const sessionChannel = `presence-session-${sessionId}`;
        console.log(`  -> Envoi de 'session-ended' au canal de session: ${sessionChannel}`);
        await pusherTrigger(sessionChannel, 'session-ended', eventData);
        
        const classChannel = `presence-classe-${classroomId}`;
        console.log(`  -> Envoi de 'session-ended' au canal de classe: ${classChannel}`);
        await pusherTrigger(classChannel, 'session-ended', eventData);

        console.log('✅ [ACTION END SESSION] - Session terminée avec succès.');
        return { 
            id: sessionId, 
            success: true 
        };
        
    } catch (error) {
        console.error('💥 [ACTION END SESSION] - Erreur:', error);
        throw new Error('Impossible de terminer la session');
    }
}


export async function serverSpotlightParticipant(sessionId: string, participantId: string) {
    console.log(`🌟 [ACTION SPOTLIGHT - SERVER] - Exécution de la mise en vedette pour ${participantId}.`);
    return await spotlightParticipant(sessionId, participantId);
}

export async function broadcastTimerEvent(sessionId: string, event: string, data?: any) {
    console.log(`⏱️ [ACTION TIMER] - Diffusion de l'événement '${event}' pour la session ${sessionId}`);
    try {
        if (!sessionId || !event) {
            console.error('❌ [ACTION TIMER] - sessionId et event sont requis.');
            throw new Error('sessionId et event sont requis');
        }
        const channel = `presence-session-${sessionId}`;
        
        const payload = { 
            ...data,
            sessionId,
            timestamp: new Date().toISOString()
        };
        console.log(`  Payload diffusé sur ${channel}:`, payload);
        await pusherTrigger(
            channel, 
            event, 
            payload
        );
        
        return { success: true, event, sessionId };
        
    } catch (error) {
        console.error('💥 [ACTION TIMER] - Erreur:', error);
        throw new Error(
            error instanceof Error 
                ? `Échec de la diffusion timer: ${error.message}`
                : 'Erreur inconnue lors de la diffusion timer'
        );
    }
}

export async function broadcastActiveTool(sessionId: string, tool: string) {
    console.log(`🛠️ [ACTION TOOL] - Diffusion de l'outil actif '${tool}' pour la session ${sessionId}`);
    try {
        if (!sessionId || !tool) {
            console.error('❌ [ACTION TOOL] - sessionId et tool sont requis.');
            throw new Error('sessionId et tool sont requis');
        }
        const channel = `presence-session-${sessionId}`;
        
        const payload = { 
            tool,
            sessionId,
            timestamp: new Date().toISOString()
        };
        console.log(`  Événement 'active-tool-changed' diffusé sur ${channel} avec payload:`, payload);
        await pusherTrigger(
            channel, 
            'active-tool-changed', 
            payload
        );
        
        return { success: true, tool, sessionId };
        
    } catch (error) {
        console.error('💥 [ACTION TOOL] - Erreur:', error);
        throw new Error(
            error instanceof Error 
                ? `Échec de la diffusion de l'outil: ${error.message}`
                : 'Erreur inconnue lors de la diffusion de l\'outil'
        );
    }
}

export async function updateStudentSessionStatus(
  sessionId: string,
  status: { isHandRaised?: boolean; understanding?: ComprehensionLevel }
) {
  console.log(`🙋 [ACTION STATUS] - Mise à jour du statut pour un élève dans la session ${sessionId}`);
  const session = await getAuthSession();
  if (!session?.user?.id) {
    console.error('❌ [ACTION STATUS] - Utilisateur non authentifié.');
    throw new Error('Utilisateur non authentifié');
  }
  const userId = session.user.id;
  console.log(`  Utilisateur: ${userId}, Statut à mettre à jour:`, status);

  const channel = `presence-session-${sessionId}`;

  if (status.isHandRaised !== undefined) {
    console.log(`  -> Diffusion de 'hand-raise-update' avec isRaised=${status.isHandRaised}`);
    await pusherTrigger(channel, 'hand-raise-update', { userId, isRaised: status.isHandRaised });
  }

  if (status.understanding !== undefined) {
    console.log(`  -> Diffusion de 'understanding-update' avec status=${status.understanding}`);
    await pusherTrigger(channel, 'understanding-update', { userId, status: status.understanding });
  }

  console.log('✅ [ACTION STATUS] - Mise à jour du statut diffusée avec succès.');
  return { success: true };
}

// Types pour TypeScript
export interface SessionData extends CoursSession {
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

export async function reinviteStudentToSession(sessionId: string, studentId: string, classroomId: string) {
    console.log(`🔄 [ACTION REINVITE] - Tentative de ré-invitation de l'élève ${studentId} à la session ${sessionId}`);
    try {
        const session = await getAuthSession();
        if (!session?.user || session.user.role !== 'PROFESSEUR') {
            console.error('❌ [ACTION REINVITE] - Non autorisé: Seul un professeur peut ré-inviter un élève.');
            throw new Error("Seul un professeur peut ré-inviter un élève.");
        }
        
        console.log(`  Envoi d'une nouvelle invitation individuelle à ${studentId}.`);
        await sendIndividualInvitations(sessionId, session.user.id, classroomId, [studentId]);
        
        console.log(`  Revalidation du chemin pour la session: /session/${sessionId}`);
        revalidatePath(`/session/${sessionId}`);
        
        console.log(`✅ [ACTION REINVITE] - Invitation envoyée avec succès à ${studentId}.`);
        return { success: true };
    } catch (error) {
        console.error(`💥 [ACTION REINVITE] - Erreur lors de la ré-invitation de ${studentId}:`, error);
        throw new Error("Impossible de ré-inviter l'élève.");
    }
}

export async function broadcastDocumentUrl(sessionId: string, url: string) {
    console.log(`📄 [ACTION DOCUMENT] - Diffusion de l'URL du document pour la session ${sessionId}`);
    try {
        if (!sessionId || !url) {
            console.error('❌ [ACTION DOCUMENT] - sessionId et url sont requis.');
            throw new Error('sessionId et url sont requis');
        }
        const channel = `presence-session-${sessionId}`;
        console.log(`  Diffusion sur le canal ${channel} avec l'URL: ${url}`);
        await pusherTrigger(channel, 'document-updated', { url });
        console.log(`  Événement 'document-updated' diffusé sur ${channel}.`);
        return { success: true };
    } catch (error) {
        console.error('💥 [ACTION DOCUMENT] - Erreur:', error);
        throw new Error("Impossible de diffuser l'URL du document.");
    }
}
