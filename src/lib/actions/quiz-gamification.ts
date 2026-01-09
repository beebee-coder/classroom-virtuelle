// src/lib/actions/quiz-gamification.ts
'use server';

import { Role } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
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
  const session = await getAuthSession();
  
  if (!session?.user || session.user.role !== Role.PROFESSEUR) {
    throw new Error('Accès refusé');
  }

  // 1. Récupérer le quiz avec son statut de récompense
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

  // Idempotence : vérifier si les points ont déjà été attribués
  if (quiz.awardedPointsAt) {
    return { success: true, message: 'Points déjà attribués pour ce quiz' };
  }

  // 2. Récupérer toutes les réponses avec timestamps
    const responses = await prisma.quizResponse.findMany({
      where: { quizId },
      select: {
        userId: true,
        answers: true,
        answerTimestamps: true,
        submittedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });

  if (responses.length === 0) {
    await prisma.quiz.update({
      where: { id: quizId },
      data: { awardedPointsAt: new Date() }
    });
    return { success: true, message: 'Aucune réponse à traiter' };
  }

  // 3. Calculer le score enrichi pour chaque élève
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

      // 10 points de base
      totalScore += 10;

      // Bonus de rapidité PAR QUESTION
      if (answerTimestamps && answerTimestamps[question.id]) {
        const answerTime = new Date(answerTimestamps[question.id]).getTime();
        const questionStartTime = response.submittedAt.getTime();
        const timeDiffSec = (answerTime - questionStartTime) / 1000;
        const speedBonus = Math.max(0, 5 - timeDiffSec); // Max 5 pts si réponse en <1s
        totalScore += speedBonus;
      }
    }

    studentScores.push({
      userId: response.userId,
      name: response.user.name || 'Élève',
      score: Math.floor(totalScore)
    });
  }

  // 4. Trier et prendre les 3 premiers
  studentScores.sort((a, b) => b.score - a.score);
  const top3 = studentScores.slice(0, 3);

  // 5. Mettre à jour les points DANS UNE TRANSACTION
  await prisma.$transaction(async (tx) => {
    // Attribuer les points
    for (const { userId, score } of top3) {
      if (score > 0) {
        await tx.user.update({
          where: { id: userId },
          data: { points: { increment: score } }
        });
      }
    }

    // Marquer le quiz comme récompensé
    await tx.quiz.update({
      where: { id: quizId },
      data: { awardedPointsAt: new Date() }
    });
  });

  // 6. Rafraîchir le cache
  revalidatePath('/teacher/dashboard');
  revalidatePath('/student/dashboard');

  return {
    success: true,
    top3,
    message: `${top3.length} élève(s) récompensé(s)`
  };
}
