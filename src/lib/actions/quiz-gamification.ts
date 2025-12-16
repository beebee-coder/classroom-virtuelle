
// src/lib/actions/quiz-gamification.ts
'use server';

import { Role } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { revalidatePath } from 'next/cache';

/**
 * Attribue des points aux 3 premiers élèves d'un quiz, basés sur :
 * - Précision (10 pts par bonne réponse)
 * - Rapidité (bonus jusqu'à 5 pts par question, calculé à partir du timestamp de soumission de chaque réponse)
 * 
 * Ne peut être appelé que par un PROFESSEUR.
 * Idempotent : ne récompense qu'une seule fois par quiz.
 */
export async function awardQuizPointsToTopStudents(quizId: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || session.user.role !== Role.PROFESSEUR) {
    throw new Error('Accès refusé');
  }

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        include: { options: true }
      }
    }
  });

  if (!quiz) {
    throw new Error('Quiz non trouvé');
  }

  if (quiz.awardedPointsAt) {
    return { success: true, message: 'Points déjà attribués pour ce quiz' };
  }

  const responses = await prisma.quizResponse.findMany({
    where: { quizId },
    include: { user: true }
  });

  if (responses.length === 0) {
    await prisma.quiz.update({
      where: { id: quizId },
      data: { awardedPointsAt: new Date() }
    });
    return { success: true, message: 'Aucune réponse à traiter' };
  }

  const studentScores: { userId: string; name: string; score: number }[] = [];

  for (const response of responses) {
    if (response.user.role !== Role.ELEVE) continue;

    let totalScore = 0;
    const answers = response.answers as Record<string, string>;
    const answerTimestamps = response.answerTimestamps as Record<string, string> | undefined;

    for (const question of quiz.questions) {
      const selectedOptionId = answers[question.id];
      if (!selectedOptionId) continue;

      const isCorrect = selectedOptionId === question.correctOptionId;
      if (!isCorrect) continue;

      totalScore += 10;

      if (answerTimestamps && answerTimestamps[question.id]) {
        const answerTime = new Date(answerTimestamps[question.id]).getTime();
        const quizCreationTime = quiz.createdAt.getTime(); // Use quiz creation as a stable start time
        const timeDiffSec = (answerTime - quizCreationTime) / 1000;
        const speedBonus = Math.max(0, 5 - timeDiffSec);
        totalScore += speedBonus;
      }
    }

    studentScores.push({
      userId: response.userId,
      name: response.user.name || 'Élève',
      score: Math.floor(totalScore)
    });
  }

  studentScores.sort((a, b) => b.score - a.score);
  const top3 = studentScores.slice(0, 3);

  await prisma.$transaction(async (tx) => {
    for (const { userId, score } of top3) {
      if (score > 0) {
        await tx.user.update({
          where: { id: userId },
          data: { points: { increment: score } }
        });
      }
    }

    await tx.quiz.update({
      where: { id: quizId },
      data: { awardedPointsAt: new Date() }
    });
  });

  revalidatePath('/teacher/dashboard');
  revalidatePath('/student/dashboard');

  return {
    success: true,
    top3,
    message: `${top3.length} élève(s) récompensé(s)`
  };
}
