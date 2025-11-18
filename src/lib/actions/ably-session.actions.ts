// src/lib/actions/ably-session.actions.ts
'use server';

import { ablyTrigger } from '../ably/triggers';
import { AblyEvents } from '../ably/events';
import { getSessionChannelName } from '../ably/channels';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { Role } from '@prisma/client';
import { ComprehensionLevel } from '@/types';
import prisma from '../prisma';

/**
 * Updates a student's status (hand raised, comprehension) and broadcasts it.
 */
export async function updateStudentSessionStatus(
  sessionId: string,
  status: {
    isHandRaised?: boolean;
    understanding?: ComprehensionLevel;
  }
) {
  console.log(`🙋 [ACTION] updateStudentSessionStatus pour la session ${sessionId}`);
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== Role.ELEVE) {
    console.error('❌ [ACTION] Non autorisé: Seul un élève peut mettre à jour son statut.');
    throw new Error('Unauthorized');
  }
  
  const studentId = session.user.id;
  const channelName = getSessionChannelName(sessionId);
  
  if (status.isHandRaised !== undefined) {
    console.log(`  -> Main levée: ${status.isHandRaised}`);
    await ablyTrigger(channelName, AblyEvents.HAND_RAISE_UPDATE, { userId: studentId, isRaised: status.isHandRaised });
  }

  if (status.understanding !== undefined) {
    console.log(`  -> Compréhension: ${status.understanding}`);
    await ablyTrigger(channelName, AblyEvents.UNDERSTANDING_UPDATE, { userId: studentId, status: status.understanding });
  }

  return { success: true };
}

/**
 * Broadcasts the currently active teaching tool to all participants.
 */
export async function broadcastActiveTool(sessionId: string, tool: string) {
  console.log(`🛠️ [ACTION] broadcastActiveTool pour la session ${sessionId}: ${tool}`);
  const session = await getServerSession(authOptions);
  
  if (session?.user?.role !== Role.PROFESSEUR) {
    console.error('❌ [ACTION] Non autorisé: Seul un professeur peut changer d\'outil.');
    throw new Error('Unauthorized');
  }

  await ablyTrigger(getSessionChannelName(sessionId), AblyEvents.ACTIVE_TOOL_CHANGED, { tool });
  return { success: true };
}


/**
 * Broadcasts timer-related events to all participants.
 */
export async function broadcastTimerEvent(
  sessionId: string,
  event: 'timer-started' | 'timer-paused' | 'timer-reset',
  data?: any
) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== Role.PROFESSEUR) {
        throw new Error('Unauthorized');
    }
    
    const eventName = AblyEvents[event.toUpperCase().replace('-', '_') as keyof typeof AblyEvents];
    
    if (!eventName) {
        throw new Error('Invalid timer event');
    }

    await ablyTrigger(getSessionChannelName(sessionId), eventName, data);
    return { success: true };
}
