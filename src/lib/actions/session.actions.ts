// src/lib/actions/session.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { pusherTrigger } from '../pusher/server';
import { getAuthSession } from '../session';
import { ComprehensionLevel } from '@/components/StudentSessionControls';
import prisma from '../prisma';
import { Role, type CoursSession, type User, type DocumentInHistory } from '@prisma/client';

export async function createCoursSession(professeurId: string, classroomId: string, studentIds: string[]) {
    console.log('🚀 [ACTION SESSION] - Début de la création de la session de cours...');
    try {
        console.log(`  Création pour prof ${professeurId}, classe ${classroomId} avec ${studentIds.length} élève(s).`);
        
        if (!professeurId || !classroomId || !studentIds || !Array.isArray(studentIds)) {
             console.error('❌ [ACTION SESSION] - Paramètres invalides.');
            throw new Error('Paramètres invalides: professeurId, classroomId et studentIds sont requis');
        }

        const participantIds = [professeurId, ...studentIds];

        // Créer la session et connecter les participants dans une seule transaction
        const session = await prisma.coursSession.create({
            data: {
                professeurId: professeurId,
                classroomId: classroomId,
                participants: {
                    connect: participantIds.map(id => ({ id }))
                }
            },
            include: {
                participants: true
            }
        });

        console.log(`  Session ${session.id} et ses participants créés en base de données.`);

        const invitationResults = await sendIndividualInvitations(session.id, professeurId, classroomId, studentIds);

        // Revalidate the path for each invited student
        studentIds.forEach(id => {
            console.log(`  Revalidation du chemin pour l'élève: /student/${id}`);
            revalidatePath(`/student/dashboard`);
            revalidatePath(`/student/${id}`);
        });
        
        console.log('✅ [ACTION SESSION] - Création de session terminée avec succès.');
        return { 
            id: session.id, 
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

    const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } });
    const teacher = await prisma.user.findUnique({ where: { id: professeurId } });

    const invitationPayload = {
        sessionId: sessionId,
        teacherId: professeurId,
        classroomId: classroomId,
        classroomName: classroom?.nom || 'Classe inconnue',
        teacherName: teacher?.name || 'Professeur',
        timestamp: new Date().toISOString(),
        type: 'session-invitation'
    };
    
    console.log('  Payload d\'invitation préparé:', invitationPayload);

    // Pas de stockage en mémoire, Pusher gère la livraison en temps réel.
    // Pour les invitations manquées, le client pourrait faire un appel pour voir si une session active pour sa classe existe.

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

        const session = await prisma.coursSession.findUnique({
            where: { id: sessionId },
            include: {
                professeur: true,
                participants: true,
            }
        });

        if (!session) {
            console.error(`❌ [ACTION SESSION DETAILS] - Session non trouvée: ${sessionId}`);
            throw new Error('Session non trouvée.');
        }

        const students = session.participants
            .filter((p) => p.role === Role.ELEVE);

        console.log('✅ [ACTION SESSION DETAILS] - Détails de session récupérés.');
        return {
            id: session.id,
            teacher: session.professeur,
            students: students,
        };
        
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

        const session = await prisma.coursSession.update({
            where: { id: sessionId },
            data: { endTime: new Date() }
        });

        const classroomId = session.classroomId;

        const eventData = { 
            sessionId,
            endedAt: new Date().toISOString()
        };
        
        const sessionChannel = `presence-session-${sessionId}`;
        console.log(`  -> Envoi de 'session-ended' au canal de session: ${sessionChannel}`);
        await pusherTrigger(sessionChannel, 'session-ended', eventData);
        
        if (classroomId) {
            const classChannel = `presence-classe-${classroomId}`;
            console.log(`  -> Envoi de 'session-ended' au canal de classe: ${classChannel}`);
            await pusherTrigger(classChannel, 'session-ended', eventData);
        }


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

  //   if (status.understanding !== undefined) {
  //     console.log(`  -> Diffusion de 'understanding-update' avec status=${status.understanding}`);
  //     await pusherTrigger(channel, 'understanding-update', { userId, status: status.understanding });
  //   }

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
    teacher: User;
    students: User[];
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

export async function shareDocument(sessionId: string, document: DocumentInHistory) {
    console.log(`📄 [ACTION DOCUMENT] - Partage du document '${document.name}' pour la session ${sessionId}`);
    try {
        if (!sessionId || !document?.url || !document?.name) {
            throw new Error('sessionId et document (name, url) sont requis.');
        }

        const session = await prisma.coursSession.findUnique({
            where: { id: sessionId },
            select: { documentHistory: true }
        });

        if (!session) {
            throw new Error('Session non trouvée.');
        }

        const currentHistory = (session.documentHistory as DocumentInHistory[] | null) || [];
        
        const isAlreadyInHistory = currentHistory.some(doc => doc.url === document.url);
        
        let updatedHistory = currentHistory;
        if (!isAlreadyInHistory) {
            updatedHistory = [...currentHistory, document];
            await prisma.coursSession.update({
                where: { id: sessionId },
                data: { documentHistory: updatedHistory as any }
            });
            console.log(`  Historique des documents mis à jour en base de données.`);
        } else {
             console.log(`  Document déjà présent dans l'historique.`);
        }

        const channel = `presence-session-${sessionId}`;
        const payload = {
            url: document.url,
            newHistory: updatedHistory,
        };
        
        console.log(`  Diffusion de l'événement 'document-updated' sur le canal ${channel}.`);
        await pusherTrigger(channel, 'document-updated', payload);
        
        return { success: true };
    } catch (error) {
        console.error('💥 [ACTION DOCUMENT] - Erreur:', error);
        throw new Error("Impossible de partager le document.");
    }
}
