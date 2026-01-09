// src/lib/actions/session.actions.ts - VERSION CORRIGÉE
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
import { ComprehensionLevel, type DocumentInHistory, type ClassroomWithDetails, QuizWithQuestions } from '@/types'; // CORRECTION: Utiliser QuizWithQuestions

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
  activeQuiz: QuizWithQuestions | null; // CORRECTION: Utiliser QuizWithQuestions
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
    const validTools = ['camera', 'whiteboard', 'document', 'screen', 'chat', 'participants', 'quiz', 'breakout'];
    if (validTools.includes(tool)) {
        return tool;
    }
    console.warn(`[TOOL VALIDATION] Invalid tool '${tool}', defaulting to 'camera'`);
    return 'camera';
};

// --- Core Session Actions ---

export async function saveAndShareDocument(
    sessionId: string,
    newDoc: { name: string; url: string }
): Promise<{ success: true; document: DocumentInHistory }> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        console.error('❌ [SAVE & SHARE] - Not authenticated');
        throw new Error('Not authenticated');
    }
    const userId = session.user.id;

    console.log('💾📤 [SAVE & SHARE] - Saving and sharing document:', { sessionId, newDoc });

    try {
        const newDocument = await prisma.sharedDocument.create({
            data: {
                name: newDoc.name,
                url: newDoc.url,
                userId: userId,
            },
        });

        console.log('✅ [SAVE & SHARE] - Document saved to database:', newDocument);

        if (!newDocument.id) {
            throw new Error('Failed to create document: ID is undefined');
        }

        const payload: DocumentInHistory = {
            id: newDocument.id,
            name: newDocument.name,
            url: newDocument.url,
            createdAt: newDocument.createdAt.toISOString(),
            sharedBy: session.user.name ?? 'Professeur',
            coursSessionId: sessionId,
        };

        const channel = getSessionChannelName(sessionId);
        await ablyTrigger(channel, AblyEvents.DOCUMENT_SHARED, {
            ...payload,
            sharedByUserId: userId
        });
        
        console.log('📡 [SAVE & SHARE] - Broadcasted DOCUMENT_SHARED event.');

        revalidatePath(`/session/${sessionId}`);
        return { success: true, document: payload };

    } catch (error) {
        console.error('❌ [SAVE & SHARE] - Error:', error);
        throw new Error('Failed to save and share document: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
}

export async function createCoursSession(professeurId: string, classroomId: string, studentIds: string[]): Promise<SessionData> {
    console.log('🚀 [ACTION] - Lancement de createCoursSession', { professeurId, classroomId, studentIds });
    
    try {
        validateSessionParameters(professeurId, classroomId, studentIds);
        console.log('✅ [ACTION] - Paramètres validés');
        
        const classroomExists = await prisma.classroom.findUnique({
            where: { id: classroomId },
            select: { id: true, nom: true }
        });
        
        if (!classroomExists) {
            console.error('❌ [ACTION] - Classe non trouvée');
            throw new Error('Classroom not found');
        }

        console.log('✅ [ACTION] - Classe trouvée, création de la session...');
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
            console.log('✅ [ACTION] - Session créée en base de données:', newSession.id);
            return newSession;
        });

        console.log('📨 [ACTION] - Appel de sendIndividualInvitations...');
        const invitationResults = await sendIndividualInvitations(session.id, professeurId, classroomId, studentIds);
        console.log('📊 [ACTION] - Résultats des invitations:', invitationResults);

        studentIds.forEach(id => {
            revalidatePath(`/student/dashboard`);
            revalidatePath(`/student/${id}`);
        });
        
        console.log('🎉 [ACTION] - createCoursSession terminé avec succès.');
        return { ...session, invitationResults, success: true };
        
    } catch (error) {
        console.error('💥 [ACTION] - ERREUR dans createCoursSession:', error);
        throw error;
    }
}

async function sendIndividualInvitations(sessionId: string, professeurId: string, classroomId: string, studentIds: string[]) {
    console.log(`📨 [INVITE] - Début de l'envoi des invitations pour la session ${sessionId}`, studentIds);
    
    try {
        const results = { successful: [] as string[], failed: [] as string[] };

        const [classroom, teacher] = await Promise.all([
            prisma.classroom.findUnique({ where: { id: classroomId } }),
            prisma.user.findUnique({ where: { id: professeurId } })
        ]);

        if (!classroom || !teacher) {
            console.error('❌ [INVITE] - Classe ou professeur non trouvé');
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
        
        console.log('📤 [INVITE] - Payload de l\'invitation créé:', invitationPayload);
        
        const invitationPromises = studentIds.map(async (studentId) => {
            const channelName = getUserChannelName(studentId);
            console.log(`📤 [INVITE] - Envoi à ${studentId} via le canal ${channelName}`);
            try {
                const success = await ablyTrigger(channelName, AblyEvents.SESSION_INVITATION, invitationPayload);
                
                if (success) {
                    console.log(`✅ [INVITE] - Succès de l'envoi à ${studentId}`);
                    results.successful.push(studentId);
                } else {
                    console.error(`❌ [INVITE] - Échec de l'envoi Ably à ${studentId}`);
                    results.failed.push(studentId);
                }
            } catch (error) {
                console.error(`💥 [INVITE] - Erreur lors de l'envoi Ably à ${studentId}:`, error);
                results.failed.push(studentId);
            }
        });

        console.log('⏳ [INVITE] - En attente de la fin de tous les envois...');
        await Promise.allSettled(invitationPromises);

        console.log(`📊 [INVITE] - Résumé : ${results.successful.length} succès, ${results.failed.length} échecs`);
        return results;
        
    } catch (error) {
        console.error('💥 [INVITE] - ERREUR dans sendIndividualInvitations:', error);
        throw error;
    }
}

export async function endCoursSession(sessionId: string) {
    console.log(`🔚 [ACTION] - Fin de la session ${sessionId}`);
    
    // CORRECTION : S'assurer de récupérer le classroomId
    const session = await prisma.coursSession.update({
        where: { id: sessionId },
        data: { endTime: new Date() },
        select: { id: true, classroomId: true } // Récupérer l'ID de la classe
    });

    if (!session || !session.classroomId) {
        console.error(`❌ [ACTION] - Impossible de trouver la session ou l'ID de la classe pour ${sessionId}`);
        throw new Error("Session or classroom data missing.");
    }

    const eventData = { sessionId, endedAt: new Date().toISOString() };
    
    // CORRECTION : Construire les noms de canaux avec des données valides
    const channels = [
        getSessionChannelName(sessionId),
        getClassChannelName(session.classroomId)
    ];

    await ablyTrigger(channels, AblyEvents.SESSION_ENDED, eventData);

    console.log('✅ [ACTION] - Session terminée et événement diffusé.');
    return { id: sessionId, success: true };
}

export async function spotlightParticipant(sessionId: string, participantId: string) {
    console.log(`🌟 [ACTION] - Mise en vedette de ${participantId} dans la session ${sessionId}`);
    
    const sessionExists = await prisma.coursSession.count({ where: { id: sessionId } });
    if (!sessionExists) throw new Error('Session not found');

    const channelName = getSessionChannelName(sessionId);
    await ablyTrigger(channelName, AblyEvents.PARTICIPANT_SPOTLIGHTED, { participantId, sessionId, timestamp: new Date().toISOString() });

    revalidatePath(`/session/${sessionId}`);
    console.log('✅ [ACTION] - Événement de mise en vedette diffusé.');
    return { success: true, participantId, sessionId };
}

export async function shareDocumentToStudents(
    sessionId: string,
    document: DocumentInHistory
): Promise<{ success: boolean }> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        console.error('❌ [SHARE TO STUDENTS] - Non authentifié');
        throw new Error('Not authenticated');
    }

    console.log('📤 [SHARE TO STUDENTS] - Partage du document aux élèves:', { sessionId, document });

    try {
        const channel = getSessionChannelName(sessionId);
        
        console.log('📡 [SHARE TO STUDENTS] - Diffusion sur le canal:', channel, 'avec le document:', document);
        
        await ablyTrigger(channel, AblyEvents.DOCUMENT_SHARED, {
            ...document,
            sharedByUserId: session.user.id,
            timestamp: new Date().toISOString()
        });

        console.log('✅ [SHARE TO STUDENTS] - Document partagé aux élèves avec succès');
        
        return { success: true };

    } catch (error) {
        console.error('❌ [SHARE TO STUDENTS] - Erreur lors du partage du document aux élèves:', error);
        throw new Error('Failed to share document to students: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
}

export async function deleteSharedDocument(documentId: string, sessionId: string, currentUserId: string) {
    console.log(`🗑️ [ACTION] - Suppression du document ${documentId} de la session ${sessionId}`);
    
    try {
        if (!currentUserId) {
            console.error('❌ [DOCUMENT DELETE] - Utilisateur non authentifié');
            throw new Error('Non authentifié');
        }

        const documentToDelete = await prisma.sharedDocument.findUnique({
            where: { id: documentId },
            include: { user: true }
        });

        if (!documentToDelete) {
            throw new Error('Document non trouvé');
        }

        if (documentToDelete.userId !== currentUserId) {
            throw new Error('Action non autorisée - Vous ne pouvez supprimer que vos propres documents');
        }

        await prisma.sharedDocument.delete({
            where: { id: documentId }
        });

        try {
            const channelName = getSessionChannelName(sessionId);
            await ablyTrigger(channelName, AblyEvents.DOCUMENT_DELETED, {
                documentId,
                deletedBy: currentUserId,
                sessionId,
                timestamp: new Date().toISOString()
            });
        } catch (broadcastError) {
            console.warn('⚠️ [DOCUMENT DELETE] - La diffusion a échoué, mais le document a été supprimé:', broadcastError);
        }

        revalidatePath(`/session/${sessionId}`);
        revalidatePath('/teacher/dashboard');
        
        return { success: true, documentId };

    } catch (error) {
        console.error(`❌ [DOCUMENT DELETE] - Erreur lors de la suppression du document ${documentId}:`, error);
        throw new Error(error instanceof Error ? error.message : 'Erreur lors de la suppression du document');
    }
}

export async function getTeacherDocuments(): Promise<DocumentInHistory[]> {
    console.log('📚 [ACTION] getTeacherDocuments');
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return [];

    console.log(` -> pour l'utilisateur ${session.user.id}`);
    const documents = await prisma.sharedDocument.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' }
    });

    console.log(` -> ${documents.length} documents trouvés.`);
    return documents.map(doc => ({
        id: doc.id,
        name: doc.name,
        url: doc.url,
        createdAt: doc.createdAt.toISOString(),
        sharedBy: session.user?.name ?? 'Professeur',
        coursSessionId: '' 
    }));
}

export async function reinviteStudentToSession(sessionId: string, studentId: string, classroomId: string) {
    console.log(`🔄 [ACTION] - Ré-invitation de ${studentId} à la session ${sessionId}`);
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== Role.PROFESSEUR) throw new Error("Seuls les professeurs peuvent ré-inviter.");

    const sessionExists = await prisma.coursSession.count({ where: { id: sessionId, professeurId: session.user.id } });
    if (!sessionExists) throw new Error('Session non trouvée ou non possédée par l\'utilisateur');

    await sendIndividualInvitations(sessionId, session.user.id, classroomId, [studentId]);

    revalidatePath(`/session/${sessionId}`);
    return { success: true };
}

export async function cleanupExpiredSessions() {
    console.log('🧹 [ACTION] - Nettoyage des sessions expirées...');
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    const { count } = await prisma.coursSession.updateMany({
        where: {
            endTime: null,
            startTime: { lt: twoHoursAgo }
        },
        data: { endTime: new Date() }
    });

    console.log(`✅ [ACTION] - ${count} sessions expirées nettoyées.`);
    return { cleaned: count };
}

export async function getSessionDetails(sessionId: string): Promise<SessionDetails | null> {
    console.log(`ℹ️ [ACTION] - Récupération des détails de la session ${sessionId}`);
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
            },
            activeQuiz: {
                include: {
                    questions: {
                        include: {
                            options: true
                        }
                    }
                }
            }
        }
    });

    if (!sessionData) return null;

    const documents = await getTeacherDocuments();

    // CORRECTION: Convertir le quiz en QuizWithQuestions
    const activeQuiz = sessionData.activeQuiz ? {
        ...sessionData.activeQuiz,
        questions: sessionData.activeQuiz.questions.map(q => ({
            ...q,
            options: q.options
        }))
    } as QuizWithQuestions : null;

    return {
        id: sessionData.id,
        teacher: sessionData.professeur,
        students: sessionData.participants.filter(p => p.role === Role.ELEVE),
        participants: sessionData.participants,
        documentHistory: documents,
        classroom: sessionData.classe as any,
        startTime: sessionData.startTime.toISOString(),
        endTime: sessionData.endTime?.toISOString() || null,
        activeQuiz: activeQuiz, // Utiliser la version convertie
    };
}