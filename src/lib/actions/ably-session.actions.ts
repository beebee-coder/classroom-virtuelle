// src/lib/actions/ably-session.actions.ts
'use server';

import { getAuthSession } from "@/lib/auth";
import { ablyTrigger } from '../ably/triggers';
import { AblyEvents } from '../ably/events';
import { getSessionChannelName } from '../ably/channels';
import { Role } from '@prisma/client';
import { ComprehensionLevel, Quiz, QuizResponse, QuizResults } from '@/types';
import prisma from '../prisma';

// Type pour les données de création d'un quiz, venant du client
export interface CreateQuizData {
  title: string;
  questions: Array<{
    id: string;
    text: string;
    options: Array<{ id: string; text: string }>;
    correctOptionId: string;
  }>;
}

// ✅ TYPES POUR LE RETOUR DE endQuiz
export interface EndQuizSuccess {
  success: true;
  results: QuizResults;
}

export interface EndQuizFailure {
  success: false;
  error: string;
}

export type EndQuizResult = EndQuizSuccess | EndQuizFailure;

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
  const session = await getAuthSession();
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
  const session = await getAuthSession();
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
  const session = await getAuthSession();
  if (session?.user?.role !== Role.PROFESSEUR) throw new Error('Only teachers can control the timer');

  const channel = getSessionChannelName(sessionId);
  const payload: { sessionId: string; timestamp: string; duration?: number } = {
    sessionId,
    timestamp: new Date().toISOString(),
  };

  if (data?.duration !== undefined) {
    payload.duration = validateTimerDuration(data.duration);
  }

  await ablyTrigger(channel, event as any, payload);
  
  return { success: true, event, sessionId };
}

// --- Quiz Actions ---

export async function closeQuiz(sessionId: string): Promise<{ success: boolean }> {
  console.log(`🚪 [ACTION] - Fermeture du quiz pour la session ${sessionId}`);
  const session = await getAuthSession();
  if (session?.user?.role !== Role.PROFESSEUR) {
    throw new Error('Only teachers can close a quiz');
  }

  const channel = getSessionChannelName(sessionId);
  await ablyTrigger(channel, AblyEvents.QUIZ_CLOSED, { sessionId });
  
  return { success: true };
}

export async function startQuiz(sessionId: string, quizData: CreateQuizData): Promise<{ success: boolean; error?: string }> {
  console.log(`🎯 [ACTION] - Lancement du quiz pour la session ${sessionId}`);
  const session = await getAuthSession();
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

// ✅ FONCTION CORRIGÉE : vérifie l'existence du quiz et utilise le bon quizId
export async function submitQuizResponse(sessionId: string, response: QuizResponse): Promise<{ success: boolean }> {
  console.log(`📝 [ACTION] - Soumission d'une réponse au quiz pour la session ${sessionId}`);
  const session = await getAuthSession();
  if (!session?.user?.id) {
    throw new Error('Not authenticated');
  }

  // 🔴 CORRECTION 1 : utilisez response.quizId, PAS response.userId
  const quizId = response.quizId;
  const userId = session.user.id;
  const now = new Date().toISOString();

  // ✅ CORRECTION 2 : vérifiez que le quiz existe
  const quizExists = await prisma.quiz.findUnique({
    where: { id: quizId }
  });

  if (!quizExists) {
    console.error(`❌ Quiz non trouvé lors de la soumission: ${quizId}`);
    return { success: false };
  }

  // 1. Récupérer la réponse existante
  const existingResponse = await prisma.quizResponse.findUnique({
    where: { quizId_userId: { quizId, userId } },
  });

  const currentAnswers = (existingResponse?.answers as Record<string, string>) || {};
  const currentTimestamps = (existingResponse?.answerTimestamps as Record<string, string>) || {};

  // 2. Fusionner les réponses
  const updatedAnswers = { ...currentAnswers, ...response.answers };
  const updatedTimestamps = { ...currentTimestamps };

  // 3. Ajouter les timestamps manquants
  Object.keys(response.answers).forEach(questionId => {
    if (!currentTimestamps[questionId]) {
      updatedTimestamps[questionId] = now;
    }
  });

  // 4. Sauvegarder
  await prisma.quizResponse.upsert({
    where: { quizId_userId: { quizId, userId } },
    create: {
      quizId,
      userId,
      answers: updatedAnswers,
      answerTimestamps: updatedTimestamps,
      submittedAt: new Date(),
    },
    update: {
      answers: updatedAnswers,
      answerTimestamps: updatedTimestamps,
      submittedAt: new Date(),
    },
  });

  // 5. Notifier les clients
  const channel = getSessionChannelName(sessionId);
  await ablyTrigger(channel, AblyEvents.QUIZ_RESPONSE, {
    userId,
    userName: session.user.name,
    answers: updatedAnswers,
  });

  return { success: true };
}

// ✅ FONCTION endQuiz — inchangée (correcte)
export async function endQuiz(
  sessionId: string,
  quizId: string,
  responses: Map<string, QuizResponse>
): Promise<EndQuizResult> {
  console.log(`🏁 [ACTION] - Fin du quiz ${quizId} pour la session ${sessionId}`);
  const session = await getAuthSession();
  if (session?.user?.role !== Role.PROFESSEUR) {
    return { success: false, error: 'Only teachers can end a quiz' };
  }

  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true },
    });

    if (!quiz) {
      return { success: false, error: "Quiz not found" };
    }

    const correctAnswers = new Map(quiz.questions.map(q => [q.id, q.correctOptionId]));
    const studentScores: Record<string, { score: number; total: number }> = {};
    const detailedResponses: Record<string, QuizResponse> = {};

    responses.forEach((response, userId) => {
      let score = 0;
      Object.entries(response.answers).forEach(([questionId, selectedOptionId]) => {
        if (correctAnswers.get(questionId) === selectedOptionId) {
          score++;
        }
      });
      studentScores[userId] = { score, total: quiz.questions.length };
      detailedResponses[userId] = response;
    });

    const results: QuizResults = {
      quizId: quizId,
      scores: studentScores,
      responses: detailedResponses,
    };

    await prisma.coursSession.update({
      where: { id: sessionId },
      data: { activeQuizId: null },
    });

    const channel = getSessionChannelName(sessionId);
    await ablyTrigger(channel, AblyEvents.QUIZ_ENDED, { results });

    console.log("✅ [ACTION] - Événement de fin de quiz diffusé.");
    return { success: true, results };
  } catch (error) {
    console.error("❌ [ACTION] - Échec de la fin du quiz:", error);
    return { success: false, error: "Failed to end quiz." };
  }
}
