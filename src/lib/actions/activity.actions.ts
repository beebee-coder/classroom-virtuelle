// src/lib/actions/activity.actions.ts
'use server';

import prisma from '@/lib/prisma';
import { getAuthSession } from '@/lib/session';

const POINTS_PER_INTERVAL = 20;
const MAX_DAILY_POINTS = 200;

export async function trackStudentActivity(activeSeconds: number) {
  try {
    const session = await getAuthSession();
    const userId = session?.user?.id;
    
    if (!userId || session.user.role !== 'ELEVE') {
      console.log('👤 [SERVEUR - Heartbeat] Action ignorée: Non-élève.');
      return { success: true, pointsAwarded: 0, reason: 'Not an authenticated student' };
    }
    
    console.log(`💓 [SERVEUR - Heartbeat] Ping Reçu: Élève ${userId}.`);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Récupérer l'état actuel du leaderboard
      const currentLeaderboard = await tx.leaderboard.findUnique({
        where: { studentId: userId }
      });

      // 2. Vérifier la limite quotidienne
      if (currentLeaderboard && currentLeaderboard.dailyPoints >= MAX_DAILY_POINTS) {
        console.log(`📈 [SERVEUR - Heartbeat] Limite quotidienne atteinte pour ${userId}.`);
        return { success: true, pointsAwarded: 0, reason: 'Daily limit reached' };
      }

      // 3. Calculer les points à attribuer
      const pointsToAward = Math.min(
        POINTS_PER_INTERVAL,
        MAX_DAILY_POINTS - (currentLeaderboard?.dailyPoints || 0)
      );

      if (pointsToAward <= 0) {
        console.log(`ℹ️ [SERVEUR - Heartbeat] Aucun point à attribuer pour ${userId}.`);
        return { success: true, pointsAwarded: 0, reason: 'No points to award' };
      }
      
      console.log(`💰 [SERVEUR - Heartbeat] Effet: +${pointsToAward} points pour ${userId}.`);

      // 4. Mettre à jour User et Leaderboard en parallèle
      const [, updatedLeaderboard] = await Promise.all([
         tx.user.update({
            where: { id: userId },
            data: {
              points: { increment: pointsToAward }
            }
         }),
         tx.leaderboard.upsert({
            where: { studentId: userId },
            create: {
              studentId: userId,
              dailyPoints: pointsToAward,
              weeklyPoints: pointsToAward,
              monthlyPoints: pointsToAward,
              totalPoints: pointsToAward,
              completedTasks: 0,
              currentStreak: 1,
              bestStreak: 1,
              rank: 0
            },
            update: {
              dailyPoints: { increment: pointsToAward },
              weeklyPoints: { increment: pointsToAward },
              monthlyPoints: { increment: pointsToAward },
              totalPoints: { increment: pointsToAward },
              updatedAt: new Date()
            }
          })
      ]);
      
      return { 
        success: true, 
        pointsAwarded: pointsToAward,
        dailyPoints: updatedLeaderboard.dailyPoints
      };
    });

    return result;
  } catch (error) {
    console.error('❌ [SERVEUR - Heartbeat] Erreur:', error);
    throw new Error('Failed to track activity.');
  }
}
