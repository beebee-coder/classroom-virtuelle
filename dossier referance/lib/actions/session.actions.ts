// src/lib/actions/session.actions.ts
'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getAuthSession } from '../session';
import { pusherServer } from '../pusher/server';

export async function createCoursSession(professeurId: string, studentIds: string[]) {
    console.log(`🚀 [Action Server] Démarrage de la création de session pour ${studentIds.length} élève(s).`);
    if (!professeurId || studentIds.length === 0) {
        throw new Error('Teacher ID and at least one student ID are required.');
    }

    const firstStudent = await prisma.user.findUnique({
        where: { id: studentIds[0] },
        select: { classroomId: true }
    });

    if (!firstStudent?.classroomId) {
        throw new Error("Could not determine the class for the session.");
    }

    const participantIds = [{ id: professeurId }, ...studentIds.map(id => ({ id }))];

    const session = await prisma.coursSession.create({
        data: {
            professeur: {
                connect: { id: professeurId }
            },
            participants: {
                connect: participantIds
            },
            classroom: {
                connect: { id: firstStudent.classroomId }
            },
            spotlightedParticipantId: professeurId, // Teacher is in spotlight by default
        },
    });

    console.log(`✅ [DB] Session ${session.id} créée. Envoi de la notification Pusher...`);
    
    const channelName = `presence-classe-${firstStudent.classroomId}`;
    await pusherServer.trigger(channelName, 'session-started', {
        sessionId: session.id,
        invitedStudentIds: studentIds,
    });
    console.log(`✅ [Pusher] Événement 'session-started' envoyé sur le canal ${channelName}.`);


    studentIds.forEach(id => {
        revalidatePath(`/student/${id}`);
    });
    console.log(`🔄 [Revalidation] Pages des élèves invalidées pour garantir la fraîcheur des données.`);

    return session;
}


export async function getSessionDetails(sessionId: string) {
    const session = await getAuthSession();
    if (!session?.user) throw new Error("Unauthorized");

    return prisma.coursSession.findUnique({
        where: { id: sessionId },
        include: {
            participants: true,
            professeur: true,
        }
    });
}


export async function spotlightParticipant(sessionId: string, participantId: string) {
    console.log(`🔦 [Action Server] Début de spotlightParticipant - Session: ${sessionId}, ParticipantID: ${participantId}`);
    
    const session = await getAuthSession();
    if (session?.user.role !== 'PROFESSEUR') {
        console.log(`❌ [Action Server] Non autorisé: Rôle=${session?.user.role}`);
        throw new Error("Unauthorized: Only teachers can spotlight participants.");
    }

    console.log(`👤 [Action Server] Professeur autorisé: ${session.user.id}`);

    const coursSession = await prisma.coursSession.findFirst({
        where: {
            id: sessionId,
            professeurId: session.user.id
        }
    });

    if (!coursSession) {
        console.log(`❌ [Action Server] Session non trouvée ou non autorisée: ${sessionId}`);
        throw new Error("Session not found or you are not the host.");
    }
    
    console.log(`✅ [Action Server] Session trouvée, mise à jour en base de données...`);
    
    await prisma.coursSession.update({
        where: { id: sessionId },
        data: { 
            spotlightedParticipantId: participantId,
        }
    });

    console.log(`✅ [DB] Session mise à jour avec spotlightedParticipantId: ${participantId}`);

    const channelName = `presence-session-${sessionId}`;
    console.log(`📡 [Pusher][OUT] Envoi événement 'participant-spotlighted' sur ${channelName}`);
    
    try {
        await pusherServer.trigger(channelName, 'participant-spotlighted', { participantId });
        console.log(`✅ [Pusher] Événement envoyé avec succès sur le canal: ${channelName}`);
    } catch (error) {
        console.error(`❌ [Pusher] Erreur lors de l'envoi:`, error);
        throw error;
    }
    
    revalidatePath(`/session/${sessionId}`);
    console.log(`🔄 [Revalidation] Page de session ${sessionId} invalidée`);
}

export async function endCoursSession(sessionId: string) {
  console.log(`🎯 [SERVER ACTION] endCoursSession EXÉCUTÉ pour ${sessionId}`);
  console.log(`🏁 [ACTION SERVER] Début de la tentative de fin de session ${sessionId}`);
  const session = await getAuthSession();
  if (session?.user.role !== 'PROFESSEUR') {
    console.log(`🔴 [ACTION SERVER] Erreur: Non autorisé. Rôle de l'utilisateur: ${session?.user.role}`);
    throw new Error('Unauthorized: Only teachers can end sessions.');
  }
   console.log(`👤 [ACTION SERVER] Professeur authentifié: ${session.user.id}`);

  const coursSession = await prisma.coursSession.findFirst({
    where: { 
        id: sessionId, 
        professeurId: session.user.id,
        endedAt: null,
    },
    include: { participants: { select: { id: true, classroomId: true } } },
  });

  if (!coursSession) {
    console.log(`🟡 [ACTION SERVER] Tentative de fin pour la session ${sessionId}, mais elle est déjà terminée, n'existe pas, ou n'appartient pas à ce professeur.`);
    return null;
  }
   console.log(`✅ [ACTION SERVER] Session ${sessionId} trouvée et active. Procédure de fin en cours.`);


  const updatedSession = await prisma.coursSession.update({
    where: { id: sessionId },
    data: { endedAt: new Date() },
  });
  console.log(`💾 [DB] Session ${sessionId} marquée comme terminée dans la base de données.`);

  const firstParticipant = coursSession.participants[0];
  if (firstParticipant?.classroomId) {
      const channelName = `presence-classe-${firstParticipant.classroomId}`;
      await pusherServer.trigger(channelName, 'session-ended', { sessionId: updatedSession.id });
      console.log(`📡 [PUSHER] Événement 'session-ended' envoyé sur le canal de classe ${channelName}.`);
  }

  // Diffuser l'événement sur le canal de la session pour notifier les participants actifs
  const sessionChannelName = `presence-session-${sessionId}`;
  await pusherServer.trigger(sessionChannelName, 'session-ended', { sessionId: updatedSession.id });
  console.log(`📡 [PUSHER] Événement 'session-ended' envoyé sur le canal de session ${sessionChannelName}.`);


  for (const participant of coursSession.participants) {
    revalidatePath(`/student/${participant.id}`);
  }
  revalidatePath(`/teacher`);

  console.log(`🎉 [ACTION SERVER] Session ${sessionId} terminée avec succès par le professeur ${session.user.id}.`);

  return updatedSession;
}


// These actions were being called from the client, but should be server actions
// for security and consistency. I am moving the fetch calls inside the main
// session page to server actions.

export async function serverSpotlightParticipant(sessionId: string, participantId: string) {
    const session = await getAuthSession();
    if (session?.user.role !== 'PROFESSEUR') {
        throw new Error("Unauthorized");
    }
    await spotlightParticipant(sessionId, participantId);
}

export async function broadcastTimerEvent(sessionId: string, event: string, data?: any) {
  const session = await getAuthSession();
  if (session?.user.role !== 'PROFESSEUR') {
    throw new Error('Unauthorized');
  }

  const coursSession = await prisma.coursSession.findFirst({
    where: { id: sessionId, professeurId: session.user.id },
  });

  if (!coursSession) {
    throw new Error('Session not found or you are not the host.');
  }

  const channel = `presence-session-${sessionId}`;
  await pusherServer.trigger(channel, event, data || {});
}
