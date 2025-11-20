// src/lib/actions/ably-session.actions.ts
'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { ablyTrigger } from '../ably/triggers';
import { AblyEvents } from '../ably/events';
import { getSessionChannelName } from '../ably/channels';
import { Role } from '@prisma/client';
import { ComprehensionLevel, Quiz, QuizResponse, QuizResults } from '@/types';
import prisma from '../prisma';

// --- Validation Utilities ---
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

// --- Real-time Interaction Actions ---

export async function updateStudentSessionStatus(sessionId: string, status: { isHandRaised?: boolean; understanding?: ComprehensionLevel }) {
    console.log(`🔄 [ACTION] - Mise à jour du statut élève pour la session ${sessionId}:`, status);
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error('Not authenticated');

    const userId = session.user.id;
    const channel = getSessionChannelName(sessionId);
    const promises = [];

    if (status.isHandRaised !== undefined) {
        console.log(`✋ [ACTION] - Diffusion du statut main-levée pour ${userId}: ${status.isHandRaised}`);
        promises.push(
            ablyTrigger(channel, AblyEvents.HAND_RAISE_UPDATE, { userId, isRaised: status.isHandRaised })
        );
    }

    if (status.understanding !== undefined) {
        console.log(`🤔 [ACTION] - Diffusion du statut compréhension pour ${userId}: ${status.understanding}`);
        promises.push(
            ablyTrigger(channel, AblyEvents.UNDERSTANDING_UPDATE, { userId, status: status.understanding })
        );
    }

    await Promise.all(promises);
    return { success: true };
}


// --- Tool-related Actions ---

export async function broadcastActiveTool(sessionId: string, tool: string) {
    console.log(`🛠️ [ACTION] - Diffusion du changement d'outil vers '${tool}' sur la session ${sessionId}`);
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

    await ablyTrigger(channel, AblyEvents.ACTIVE_TOOL_CHANGED, payload);

    return { success: true, tool: validatedTool, sessionId };
}


// --- Timer Actions ---

export async function broadcastTimerEvent(sessionId: string, event: 'timer-started' | 'timer-paused' | 'timer-reset', data?: any) {
    console.log(`⏱️ [ACTION] - Diffusion de l'événement minuteur '${event}' sur la session ${sessionId}`);
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

    await ablyTrigger(channel, event as any, payload); // Cast to any to satisfy AblyEventName type
    
    return { success: true, event, sessionId };
}

// --- Quiz Actions ---

export async function startQuiz(sessionId: string, quizData: Omit<Quiz, 'id' | 'createdAt' | 'createdById'>): Promise<{ success: boolean; error?: string }> {
  console.log(`🎯 [ACTION] - Lancement du quiz pour la session ${sessionId}`);
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== Role.PROFESSEUR) {
    return { success: false, error: 'Only teachers can start a quiz' };
  }
  
  try {
    const newQuiz = await prisma.$transaction(async (tx) => {
        const createdQuiz = await tx.quiz.create({
            data: {
              title: quizData.title,
              createdById: session.user!.id,
              questions: {
                create: quizData.questions.map(q => ({
                  id: q.id,
                  text: q.text,
                  correctOptionId: q.correctOptionId,
                  options: {
                    create: q.options.map(o => ({
                      id: o.id,
                      text: o.text,
                    })),
                  },
                })),
              },
            },
            include: { questions: { include: { options: true } } },
        });

        await tx.coursSession.update({
            where: { id: sessionId },
            data: { activeQuizId: createdQuiz.id },
        });
        
        return createdQuiz;
    });

    const channel = getSessionChannelName(sessionId);
    await ablyTrigger(channel, AblyEvents.QUIZ_STARTED, { quiz: newQuiz });
    
    return { success: true };
  } catch (error) {
    console.error("❌ [ACTION] - Échec du lancement du quiz:", error);
    return { success: false, error: "Failed to start quiz." };
  }
}

export async function submitQuizResponse(sessionId: string, response: QuizResponse): Promise<{ success: boolean }> {
  console.log(`📝 [ACTION] - Soumission d'une réponse au quiz pour la session ${sessionId}`);
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Not authenticated');
  }

  const channel = getSessionChannelName(sessionId);
  await ablyTrigger(channel, AblyEvents.QUIZ_RESPONSE, { userId: session.user.id, userName: session.user.name, answers: response.answers });
  return { success: true };
}

export async function endQuiz(sessionId: string, quizId: string): Promise<{ success: boolean }> {
  console.log(`🏁 [ACTION] - Fin du quiz ${quizId} pour la session ${sessionId}`);
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== Role.PROFESSEUR) {
    throw new Error('Only teachers can end a quiz');
  }

  // Calculer les résultats ici (logique simplifiée)
  const results: QuizResults = {
    quizId: quizId,
    scores: {},
    responses: {},
  };

  await prisma.coursSession.update({
      where: { id: sessionId },
      data: { activeQuizId: null },
  });
  
  const channel = getSessionChannelName(sessionId);
  await ablyTrigger(channel, AblyEvents.QUIZ_ENDED, { results });
  return { success: true };
}
