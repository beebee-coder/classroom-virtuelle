// src/lib/actions/session.actions.ts - VERSION CORRIGÉE AVEC updateStudentSessionStatus
'use server';

import { revalidatePath } from 'next/cache';
import { ablyTrigger } from '../ably/triggers';
import { AblyEvents } from '../ably/events';
import { getSessionChannelName, getUserChannelName, getClassChannelName } from '../ably/channels';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from '../prisma';
import type { CoursSession, User, SharedDocument } from '@prisma/client';
import { Role } from '@prisma/client';
import { ComprehensionLevel, type DocumentInHistory, type ClassroomWithDetails } from '@/types';

// --- Interfaces and Type Definitions ---

export interface SessionData extends CoursSession {
    invitationResults?: {
        successful: string[];
        failed: string[];
    };
    success?: boolean;
}

export interface SessionDetails {
    id: string;
    teacher: User;
    students: User[];
    participants: User[];
    documentHistory: DocumentInHistory[];
    classroom: ClassroomWithDetails | null;
    startTime: string;
    endTime: string | null;
}

interface InvitationPayload {
    sessionId: string;
    teacherId: string;
    classroomId: string;
    classroomName: string;
    teacherName: string;
    timestamp: string;
    type: 'session-invitation';
}

interface TimerEventData {
    duration?: number;
    sessionId: string;
    timestamp: string;
}

// --- Validation Utilities ---

const validateSessionParameters = (professeurId: string, classroomId: string, studentIds: string[]) => {
    if (!professeurId || !classroomId || !studentIds || !Array.isArray(studentIds)) {
        throw new Error('Invalid parameters: professeurId, classroomId, and studentIds are required');
    }
};

const validateTimerDuration = (duration: unknown): number => {
    if (typeof duration !== 'number' || isNaN(duration) || duration <= 0) {
        console.warn('⚠️ [TIMER] - Durée invalide détectée, utilisation de la valeur par défaut:', duration);
        return 3600; // Default to 1 hour
    }
    return duration;
};

const validateActiveTool = (tool: string): string => {
    const validTools = ['camera', 'whiteboard', 'document', 'screen', 'chat', 'participants', 'quiz'];
    if (validTools.includes(tool)) {
        return tool;
    }
    console.warn(`[TOOL VALIDATION] Invalid tool '${tool}', defaulting to 'camera'`);
    return 'camera';
};

// --- Core Session Actions ---

export async function createCoursSession(professeurId: string, classroomId: string, studentIds: string[]): Promise<SessionData> {
    console.log('🚀 [ACTION CRITIQUE] - DEBUT createCoursSession', { professeurId, classroomId, studentIds });
    
    try {
        validateSessionParameters(professeurId, classroomId, studentIds);
        console.log('✅ [ACTION CRITIQUE] - Paramètres validés');
        
        const classroomExists = await prisma.classroom.findUnique({
            where: { id: classroomId },
            select: { id: true, nom: true }
        });
        
        if (!classroomExists) {
            console.error('❌ [ACTION CRITIQUE] - Classroom not found');
            throw new Error('Classroom not found');
        }

        console.log('✅ [ACTION CRITIQUE] - Classroom trouvée, création session...');
        const participantIds = [professeurId, ...studentIds];

        const session = await prisma.$transaction(async (tx) => {
            const newSession = await tx.coursSession.create({
                data: {
                    professeurId,
                    classroomId,
                    participants: { connect: participantIds.map(id => ({ id })) }
                },
                include: { participants: true }
            });
            console.log('✅ [ACTION CRITIQUE] - Session créée en base:', newSession.id);
            return newSession;
        });

        console.log('📨 [ACTION CRITIQUE] - APPEL sendIndividualInvitations...');
        const invitationResults = await sendIndividualInvitations(session.id, professeurId, classroomId, studentIds);
        console.log('📊 [ACTION CRITIQUE] - Résultats invitations:', invitationResults);

        studentIds.forEach(id => {
            revalidatePath(`/student/dashboard`);
            revalidatePath(`/student/${id}`);
        });
        
        console.log('🎉 [ACTION CRITIQUE] - createCoursSession TERMINÉ avec succès');
        return { ...session, invitationResults, success: true };
        
    } catch (error) {
        console.error('💥 [ACTION CRITIQUE] - ERREUR dans createCoursSession:', error);
        throw error;
    }
}

async function sendIndividualInvitations(sessionId: string, professeurId: string, classroomId: string, studentIds: string[]) {
    console.log(`📨 [INVITATIONS CRITIQUE] - DEBUT sendIndividualInvitations pour session ${sessionId}`, studentIds);
    
    try {
        const results = { successful: [] as string[], failed: [] as string[] };

        const [classroom, teacher] = await Promise.all([
            prisma.classroom.findUnique({ where: { id: classroomId } }),
            prisma.user.findUnique({ where: { id: professeurId } })
        ]);

        if (!classroom || !teacher) {
            console.error('❌ [INVITATIONS CRITIQUE] - Classroom ou teacher non trouvé');
            throw new Error('Classroom or teacher not found');
        }

        const invitationPayload: InvitationPayload = {
            sessionId,
            teacherId: professeurId,
            classroomId,
            classroomName: classroom.nom || 'Classe',
            teacherName: teacher.name || 'Professeur',
            timestamp: new Date().toISOString(),
            type: 'session-invitation'
        };
        
        console.log('📤 [INVITATIONS CRITIQUE] - Payload invitation créé:', invitationPayload);
        
        const invitationPromises = studentIds.map(async (studentId) => {
            const channelName = getUserChannelName(studentId);
            console.log(`📤 [INVITATIONS CRITIQUE] - Envoi à ${studentId} via canal ${channelName}`);
            try {
                console.log(`🎯 [INVITATIONS CRITIQUE] - Appel ablyTrigger pour ${studentId}...`);
                const success = await ablyTrigger(channelName, AblyEvents.SESSION_INVITATION, invitationPayload);
                
                if (success) {
                    console.log(`✅ [INVITATIONS CRITIQUE] - SUCCÈS envoi à ${studentId}`);
                    results.successful.push(studentId);
                } else {
                    console.error(`❌ [INVITATIONS CRITIQUE] - ÉCHEC ablyTrigger pour ${studentId}`);
                    results.failed.push(studentId);
                }
            } catch (error) {
                console.error(`💥 [INVITATIONS CRITIQUE] - ERREUR ablyTrigger pour ${studentId}:`, error);
                results.failed.push(studentId);
            }
        });

        console.log('⏳ [INVITATIONS CRITIQUE] - Attente résultats envois...');
        await Promise.allSettled(invitationPromises);

        console.log(`📊 [INVITATIONS CRITIQUE] - RÉSUMÉ FINAL: ${results.successful.length} succès, ${results.failed.length} échecs`);
        return results;
        
    } catch (error) {
        console.error('💥 [INVITATIONS CRITIQUE] - ERREUR dans sendIndividualInvitations:', error);
        throw error;
    }
}

export async function updateStudentSessionStatus(sessionId: string, status: { isHandRaised?: boolean; understanding?: ComprehensionLevel }) {
    console.log(`🔄 [ACTION] - updateStudentSessionStatus for session ${sessionId}:`, status);
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error('Not authenticated');

    const userId = session.user.id;
    const channel = getSessionChannelName(sessionId);
    const promises = [];

    if (status.isHandRaised !== undefined) {
        console.log(`✋ [ACTION] - Broadcasting hand-raise status for ${userId}: ${status.isHandRaised}`);
        promises.push(
            ablyTrigger(channel, AblyEvents.HAND_RAISE_UPDATE, { userId, isRaised: status.isHandRaised })
        );
    }

    if (status.understanding !== undefined) {
        console.log(`🤔 [ACTION] - Broadcasting understanding status for ${userId}: ${status.understanding}`);
        promises.push(
            ablyTrigger(channel, AblyEvents.UNDERSTANDING_UPDATE, { userId, status: status.understanding })
        );
    }

    await Promise.all(promises);
    console.log('✅ [ACTION] - Student session status updated successfully');
    return { success: true };
}

export async function endCoursSession(sessionId: string) {
    console.log(`🔚 [ACTION] - Ending session ${sessionId}`);
    
    const session = await prisma.coursSession.update({
        where: { id: sessionId },
        data: { endTime: new Date() }
    });

    const eventData = { sessionId, endedAt: new Date().toISOString() };
    
    const channels = [
        getSessionChannelName(sessionId),
        getClassChannelName(session.classroomId)
    ];

    await ablyTrigger(channels, AblyEvents.SESSION_ENDED, eventData);

    console.log('✅ [ACTION] - Session ended and event broadcasted.');
    return { id: sessionId, success: true };
}

export async function spotlightParticipant(sessionId: string, participantId: string) {
    console.log(`🌟 [ACTION] - Spotlighting ${participantId} in session ${sessionId}`);
    
    const sessionExists = await prisma.coursSession.count({ where: { id: sessionId } });
    if (!sessionExists) throw new Error('Session not found');

    const channelName = getSessionChannelName(sessionId);
    await ablyTrigger(channelName, AblyEvents.PARTICIPANT_SPOTLIGHTED, { participantId, sessionId, timestamp: new Date().toISOString() });

    revalidatePath(`/session/${sessionId}`);
    console.log('✅ [ACTION] - Spotlight event broadcasted.');
    return { success: true, participantId, sessionId };
}

// Dans session.actions.ts - CORRECTION de la fonction shareDocument
export async function shareDocument(
    sessionId: string,
    newDoc: { name: string; url: string }
  ): Promise<{ success: true; document: DocumentInHistory }> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.error('❌ [SHARE DOCUMENT] - Not authenticated');
      throw new Error('Not authenticated');
    }
    const userId = session.user.id;
  
    console.log('📄 [SHARE DOCUMENT] - Sharing document:', { sessionId, newDoc });
  
    try {
      const newDocument = await prisma.sharedDocument.create({
        data: {
          name: newDoc.name,
          url: newDoc.url,
          userId: userId,
        },
      });
  
      console.log('✅ [SHARE DOCUMENT] - Document saved to database:', newDocument);
  
      if (!newDocument.id) {
        console.error('❌ [SHARE DOCUMENT] - Document ID is undefined after creation');
        throw new Error('Failed to create document: ID is undefined');
      }
  
      const channel = getSessionChannelName(sessionId);
      
      // ✅ CORRECTION : Créer le payload sans sharedByUserId qui n'existe pas dans DocumentInHistory
      const payload: DocumentInHistory = {
        id: newDocument.id,
        name: newDocument.name,
        url: newDocument.url,
        createdAt: newDocument.createdAt.toISOString(),
        sharedBy: session.user.name ?? 'Professeur',
        coursSessionId: sessionId,
      };
  
      console.log('📡 [SHARE DOCUMENT] - Broadcasting to channel:', channel, 'with payload:', payload);
      
      // ✅ CORRECTION : Envoyer sharedByUserId séparément dans l'événement Ably
      await ablyTrigger(channel, AblyEvents.DOCUMENT_SHARED, {
        ...payload,
        sharedByUserId: userId // ✅ Envoyer dans l'événement mais pas dans le type DocumentInHistory
      });
  
      revalidatePath(`/session/${sessionId}`);
      console.log('✅ [SHARE DOCUMENT] - Document shared successfully');
      
      return { success: true, document: payload };
  
    } catch (error) {
      console.error('❌ [SHARE DOCUMENT] - Error sharing document:', error);
      throw new Error('Failed to share document: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }
export async function deleteSharedDocument(documentId: string, sessionId: string) {
    console.log(`🗑️ [ACTION] deleteSharedDocument: ${documentId} from session ${sessionId}`);
    
    try {
        // ✅ CORRECTION : Récupération correcte de la session
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            console.error('❌ [DOCUMENT DELETE] - User not authenticated');
            throw new Error('Non authentifié');
        }

        const currentUserId = session.user.id;

        // ✅ CORRECTION : Vérification que l'utilisateur est le propriétaire du document
        const documentToDelete = await prisma.sharedDocument.findUnique({
            where: { id: documentId },
            include: {
                user: true
            }
        });

        if (!documentToDelete) {
            console.error(`❌ [DOCUMENT DELETE] - Document ${documentId} not found`);
            throw new Error('Document non trouvé');
        }

        // Vérifier que l'utilisateur est le propriétaire du document
        if (documentToDelete.userId !== currentUserId) {
            console.error(`❌ [DOCUMENT DELETE] - User ${currentUserId} is not owner of document ${documentId} (owner: ${documentToDelete.userId})`);
            throw new Error('Action non autorisée - Vous ne pouvez supprimer que vos propres documents');
        }

        console.log(`✅ [DOCUMENT DELETE] - User ${currentUserId} authorized to delete document ${documentId}`);

        // ✅ CORRECTION : Suppression du document
        await prisma.sharedDocument.delete({
            where: { id: documentId }
        });

        // ✅ CORRECTION : Broadcast de la suppression via Ably
        try {
            const channelName = getSessionChannelName(sessionId);
            console.log(`📡 [DOCUMENT DELETE] - Broadcasting deletion event on channel: ${channelName}`);
            
            await ablyTrigger(channelName, AblyEvents.DOCUMENT_DELETED, {
                documentId,
                deletedBy: currentUserId,
                sessionId,
                timestamp: new Date().toISOString()
            });
        } catch (broadcastError) {
            console.warn('⚠️ [DOCUMENT DELETE] - Broadcast failed, but document was deleted:', broadcastError);
            // Ne pas bloquer la suppression si le broadcast échoue
        }

        // ✅ CORRECTION : Revalidation des chemins
        revalidatePath(`/session/${sessionId}`);
        revalidatePath('/teacher/dashboard');
        
        console.log(`✅ [DOCUMENT DELETE] - Document ${documentId} successfully deleted from session ${sessionId}`);
        return { success: true, documentId };

    } catch (error) {
        console.error(`❌ [DOCUMENT DELETE] - Error deleting document ${documentId}:`, error);
        throw new Error(error instanceof Error ? error.message : 'Erreur lors de la suppression du document');
    }
}

export async function getTeacherDocuments(): Promise<DocumentInHistory[]> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return [];

    const documents = await prisma.sharedDocument.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' }
    });

    // Transformer le retour pour correspondre au type DocumentInHistory
    return documents.map(doc => ({
        id: doc.id,
        name: doc.name,
        url: doc.url,
        createdAt: doc.createdAt.toISOString(),
        sharedBy: session.user?.name ?? 'Professeur',
        coursSessionId: '' // Ce champ n'est plus pertinent mais conservé pour la compatibilité du type
    }));
}


// CORRECTION: Ajout des fonctions timer manquantes
export async function broadcastTimerEvent(sessionId: string, event: 'timer-started' | 'timer-paused' | 'timer-reset', data?: any) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== Role.PROFESSEUR) throw new Error('Only teachers can control the timer');

    const channel = getSessionChannelName(sessionId);
    const payload: TimerEventData = {
        sessionId,
        timestamp: new Date().toISOString(),
    };

    if (data?.duration !== undefined) {
        payload.duration = validateTimerDuration(data.duration);
    }

    console.log(`⏱️ [ACTION] - Broadcasting timer event '${event}' on ${channel}`);
    await ablyTrigger(channel, event as any, payload);
    
    return { success: true, event, sessionId };
}

export async function broadcastActiveTool(sessionId: string, tool: string) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== Role.PROFESSEUR) throw new Error('Only teachers can change tools');

    const sessionExists = await prisma.coursSession.count({ where: { id: sessionId, professeurId: session.user.id } });
    if (!sessionExists) throw new Error('Session not found or not owned by user');

    const validatedTool = validateActiveTool(tool);
    const channel = getSessionChannelName(sessionId);
    const payload = { tool: validatedTool, sessionId, timestamp: new Date().toISOString() };

    console.log(`🛠️ [ACTION] - Broadcasting tool change to '${validatedTool}' on ${channel}`);
    await ablyTrigger(channel, AblyEvents.ACTIVE_TOOL_CHANGED, payload);

    return { success: true, tool: validatedTool, sessionId };
}

export async function reinviteStudentToSession(sessionId: string, studentId: string, classroomId: string) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== Role.PROFESSEUR) throw new Error("Only teachers can re-invite.");

    const sessionExists = await prisma.coursSession.count({ where: { id: sessionId, professeurId: session.user.id } });
    if (!sessionExists) throw new Error('Session not found or not owned by user');

    console.log(`🔄 [ACTION] - Re-inviting ${studentId} to session ${sessionId}`);
    await sendIndividualInvitations(sessionId, session.user.id, classroomId, [studentId]);

    revalidatePath(`/session/${sessionId}`);
    return { success: true };
}

export async function cleanupExpiredSessions() {
    console.log('🧹 [ACTION] - Cleaning up expired sessions...');
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    const { count } = await prisma.coursSession.updateMany({
        where: {
            endTime: null,
            startTime: { lt: twoHoursAgo }
        },
        data: { endTime: new Date() }
    });

    console.log(`✅ [ACTION] - ${count} expired sessions cleaned.`);
    return { cleaned: count };
}

// Getters (do not need migration)
export async function getSessionDetails(sessionId: string): Promise<SessionDetails | null> {
    const sessionData = await prisma.coursSession.findUnique({
        where: { id: sessionId },
        include: { 
            professeur: true, 
            participants: true,
            classe: {
                include: {
                    eleves: {
                        include: {
                            etat: {
                                include: {
                                    metier: true
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    if (!sessionData) return null;

    const documents = await getTeacherDocuments();

    return {
        id: sessionData.id,
        teacher: sessionData.professeur,
        students: sessionData.participants.filter(p => p.role === Role.ELEVE),
        participants: sessionData.participants,
        documentHistory: documents,
        classroom: sessionData.classe as any,
        startTime: sessionData.startTime.toISOString(),
        endTime: sessionData.endTime?.toISOString() || null,
    };
}
