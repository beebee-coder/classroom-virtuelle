// src/lib/actions/session.actions.ts
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

const validateSessionParameters = (professeurId: string, classroomId: string, studentIds: string[]) => {
    if (!professeurId || !classroomId || !studentIds || !Array.isArray(studentIds)) {
        throw new Error('Invalid parameters: professeurId, classroomId, and studentIds are required');
    }
};

export async function createCoursSession(professeurId: string, classroomId: string, studentIds: string[]): Promise<SessionData> {
    console.log('🚀 [ACTION] - DEBUT createCoursSession', { professeurId, classroomId, studentIds });
    
    try {
        validateSessionParameters(professeurId, classroomId, studentIds);
        
        const classroomExists = await prisma.classroom.findUnique({
            where: { id: classroomId },
            select: { id: true, nom: true }
        });
        
        if (!classroomExists) throw new Error('Classroom not found');

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
            return newSession;
        });

        const invitationResults = await sendIndividualInvitations(session.id, professeurId, classroomId, studentIds);
        
        studentIds.forEach(id => {
            revalidatePath(`/student/dashboard`);
            revalidatePath(`/student/${id}`);
        });
        
        return { ...session, invitationResults, success: true };
        
    } catch (error) {
        console.error('💥 [ACTION] - ERREUR dans createCoursSession:', error);
        throw error;
    }
}

async function sendIndividualInvitations(sessionId: string, professeurId: string, classroomId: string, studentIds: string[]) {
    const results = { successful: [] as string[], failed: [] as string[] };

    const [classroom, teacher] = await Promise.all([
        prisma.classroom.findUnique({ where: { id: classroomId } }),
        prisma.user.findUnique({ where: { id: professeurId } })
    ]);

    if (!classroom || !teacher) throw new Error('Classroom or teacher not found');

    const invitationPayload: InvitationPayload = {
        sessionId,
        teacherId: professeurId,
        classroomId,
        classroomName: classroom.nom || 'Classe',
        teacherName: teacher.name || 'Professeur',
        timestamp: new Date().toISOString(),
        type: 'session-invitation'
    };
    
    const invitationPromises = studentIds.map(async (studentId) => {
        const channelName = getUserChannelName(studentId);
        try {
            // Utilise la fonction trigger côté serveur
            const success = await ablyTrigger(channelName, AblyEvents.SESSION_INVITATION, invitationPayload);
            if (success) {
                results.successful.push(studentId);
            } else {
                results.failed.push(studentId);
            }
        } catch (error) {
            results.failed.push(studentId);
        }
    });

    await Promise.allSettled(invitationPromises);
    return results;
}

export async function endCoursSession(sessionId: string) {
    const session = await prisma.coursSession.update({
        where: { id: sessionId },
        data: { endTime: new Date() }
    });

    const eventData = { sessionId, endedAt: new Date().toISOString() };
    const channels = [ getSessionChannelName(sessionId), getClassChannelName(session.classroomId) ];
    await ablyTrigger(channels, AblyEvents.SESSION_ENDED, eventData);

    return { id: sessionId, success: true };
}

export async function spotlightParticipant(sessionId: string, participantId: string) {
    const sessionExists = await prisma.coursSession.count({ where: { id: sessionId } });
    if (!sessionExists) throw new Error('Session not found');

    const channelName = getSessionChannelName(sessionId);
    // Remplacé par httpAblyTrigger côté client
    // await ablyTrigger(channelName, AblyEvents.PARTICIPANT_SPOTLIGHTED, { participantId, sessionId, timestamp: new Date().toISOString() });
    
    revalidatePath(`/session/${sessionId}`);
    return { success: true, participantId, sessionId, message: "Action déplacée côté client." };
}

export async function saveAndShareDocument(
    sessionId: string,
    newDoc: { name: string; url: string }
): Promise<{ success: true; document: DocumentInHistory }> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error('Not authenticated');

    const newDocument = await prisma.sharedDocument.create({
        data: {
            name: newDoc.name,
            url: newDoc.url,
            userId: session.user.id,
        },
    });

    const payload: DocumentInHistory = {
        id: newDocument.id,
        name: newDocument.name,
        url: newDocument.url,
        createdAt: newDocument.createdAt.toISOString(),
        sharedBy: session.user.name ?? 'Professeur',
        coursSessionId: sessionId,
    };

    // Utilise le trigger côté serveur pour notifier de l'ajout
    await ablyTrigger(getSessionChannelName(sessionId), AblyEvents.DOCUMENT_SHARED, {
        ...payload,
        sharedByUserId: session.user.id
    });
    
    revalidatePath(`/session/${sessionId}`);
    return { success: true, document: payload };
}

export async function shareDocumentToStudents(
    sessionId: string,
    document: DocumentInHistory
): Promise<{ success: boolean }> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error('Not authenticated');

    // Utilise le trigger côté serveur
    await ablyTrigger(getSessionChannelName(sessionId), AblyEvents.DOCUMENT_SHARED, {
        ...document,
        sharedByUserId: session.user.id,
        timestamp: new Date().toISOString()
    });

    return { success: true };
}

export async function deleteSharedDocument(documentId: string, sessionId: string, currentUserId: string) {
    const documentToDelete = await prisma.sharedDocument.findUnique({
        where: { id: documentId },
    });

    if (!documentToDelete) throw new Error('Document non trouvé');
    if (documentToDelete.userId !== currentUserId) throw new Error('Action non autorisée');

    await prisma.sharedDocument.delete({ where: { id: documentId } });

    // Utilise le trigger côté serveur
    await ablyTrigger(getSessionChannelName(sessionId), AblyEvents.DOCUMENT_DELETED, {
        documentId,
        deletedBy: currentUserId,
        sessionId,
        timestamp: new Date().toISOString()
    });

    revalidatePath(`/session/${sessionId}`);
    return { success: true, documentId };
}

export async function getTeacherDocuments(): Promise<DocumentInHistory[]> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return [];

    const documents = await prisma.sharedDocument.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' }
    });

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
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== Role.PROFESSEUR) throw new Error("Only teachers can re-invite.");

    const sessionExists = await prisma.coursSession.count({ where: { id: sessionId, professeurId: session.user.id } });
    if (!sessionExists) throw new Error('Session not found or not owned by user');

    await sendIndividualInvitations(sessionId, session.user.id, classroomId, [studentId]);

    revalidatePath(`/session/${sessionId}`);
    return { success: true };
}

export async function cleanupExpiredSessions() {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const { count } = await prisma.coursSession.updateMany({
        where: { endTime: null, startTime: { lt: twoHoursAgo } },
        data: { endTime: new Date() }
    });
    return { cleaned: count };
}

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
                            etat: { include: { metier: true } }
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