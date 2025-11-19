// src/lib/actions/ably-session.actions.ts
'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { ablyTrigger } from '../ably/triggers';
import { AblyEvents } from '../ably/events';
import { getSessionChannelName } from '../ably/channels';
import { Role } from '@prisma/client';
import { ComprehensionLevel, Quiz, QuizResponse } from '@/types';
import prisma from '../prisma';

// --- Validation Utilities ---
const validateTimerDuration = (duration: unknown): number => {
    if (typeof duration !== 'number' || isNaN(duration) || duration <= 0) {
        console.warn('Invalid timer duration detected, using default:', duration);
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

// --- Real-time Interaction Actions ---

export async function updateStudentSessionStatus(sessionId: string, status: { isHandRaised?: boolean; understanding?: ComprehensionLevel }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error('Not authenticated');

    const userId = session.user.id;
    const channel = getSessionChannelName(sessionId);
    const promises = [];

    if (status.isHandRaised !== undefined) {
        console.log(`✋ [ABLY ACTION] - Broadcasting hand-raise status for ${userId}: ${status.isHandRaised}`);
        promises.push(
            ablyTrigger(channel, AblyEvents.HAND_RAISE_UPDATE, { userId, isRaised: status.isHandRaised })
        );
    }

    if (status.understanding !== undefined) {
        console.log(`🤔 [ABLY ACTION] - Broadcasting understanding status for ${userId}: ${status.understanding}`);
        promises.push(
            ablyTrigger(channel, AblyEvents.UNDERSTANDING_UPDATE, { userId, status: status.understanding })
        );
    }

    await Promise.all(promises);
    return { success: true };
}


// --- Tool-related Actions ---

export async function broadcastActiveTool(sessionId: string, tool: string) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== Role.PROFESSEUR) {
        throw new Error('Only teachers can change tools');
    }

    const sessionExists = await prisma.coursSession.count({ where: { id: sessionId, professeurId: session.user.id } });
    if (!sessionExists) {
        throw new Error('Session not found or not owned by user');
    }

    const validatedTool = validateActiveTool(tool);
    const channel = getSessionChannelName(sessionId);
    const payload = { tool: validatedTool, sessionId, timestamp: new Date().toISOString() };

    console.log(`🛠️ [ABLY ACTION] - Broadcasting tool change to '${validatedTool}' on ${channel}`);
    await ablyTrigger(channel, AblyEvents.ACTIVE_TOOL_CHANGED, payload);

    return { success: true, tool: validatedTool, sessionId };
}


// --- Timer Actions ---

export async function broadcastTimerEvent(sessionId: string, event: 'timer-started' | 'timer-paused' | 'timer-reset', data?: any) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== Role.PROFESSEUR) throw new Error('Only teachers can control the timer');

    const channel = getSessionChannelName(sessionId);
    const payload: { sessionId: string; timestamp: string; duration?: number } = {
        sessionId,
        timestamp: new Date().toISOString(),
    };

    if (data?.duration !== undefined) {
        payload.duration = validateTimerDuration(data.duration);
    }

    console.log(`⏱️ [ABLY ACTION] - Broadcasting timer event '${event}' on ${channel}`);
    await ablyTrigger(channel, event as any, payload); // Cast to any to satisfy AblyEventName type
    
    return { success: true, event, sessionId };
}

// --- Quiz Actions ---

export async function startQuiz(sessionId: string, quiz: Quiz) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== Role.PROFESSEUR) {
    throw new Error('Only teachers can start a quiz');
  }
  const channel = getSessionChannelName(sessionId);
  await ablyTrigger(channel, AblyEvents.QUIZ_STARTED, { quiz });
  return { success: true };
}

export async function submitQuizResponse(sessionId: string, response: QuizResponse) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error('Not authenticated');

  const channel = getSessionChannelName(sessionId);
  await ablyTrigger(channel, AblyEvents.QUIZ_RESPONSE, { userId: session.user.id, response });
  return { success: true };
}

export async function endQuiz(sessionId: string, results: any) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== Role.PROFESSEUR) {
    throw new Error('Only teachers can end a quiz');
  }
  const channel = getSessionChannelName(sessionId);
  await ablyTrigger(channel, AblyEvents.QUIZ_ENDED, { results });
  return { success: true };
}
