// src/lib/actions/activity.actions.ts
'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from '../prisma';

const POINTS_PER_INTERVAL = 1; // Réduit pour une accumulation plus lente
const MAX_DAILY_POINTS = 50;

/**
 * Suivi de l'activité de l'élève. A appeler périodiquement (heartbeat).
 * Attribue des points pour l'activité.
 */
export async function trackStudentActivity(activeSeconds: number) {
  const session = await getServerSession(authOptions);
  
  // 1. Vérification robuste de la session et du rôle
  if (!session?.user?.id || session.user.role !== 'ELEVE') {
    console.log('👤 [HEARTBEAT] Action ignorée: Non-élève ou non authentifié.');
    return { success: true, pointsAwarded: 0, reason: 'Not an authenticated student' };
  }
  
  const userId = session.user.id;
  console.log(`💓 [HEARTBEAT] Ping reçu pour l'élève ${userId}.`);

  try {
    // 2. Logique d'attribution de points
    const pointsToAward = POINTS_PER_INTERVAL;
    
    // Mettre à jour les points de l'élève
    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { points: { increment: pointsToAward } }
    });

    console.log(`💰 [HEARTBEAT] Effet: +${pointsToAward} points pour ${userId}. Total: ${updatedUser.points}`);

    return { 
      success: true, 
      pointsAwarded: pointsToAward,
      dailyPoints: updatedUser.points, // Le total est retourné pour la démo
    };

  } catch (error) {
    console.error(`❌ [HEARTBEAT] Erreur pour l'élève ${userId}:`, error);
    // Ne pas lancer d'erreur pour ne pas casser le client, juste retourner un échec.
    return { success: false, error: 'Failed to track activity.' };
  }
}
