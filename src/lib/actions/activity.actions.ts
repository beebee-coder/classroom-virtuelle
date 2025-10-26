// src/lib/actions/activity.actions.ts
'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const POINTS_PER_INTERVAL = 20;
const MAX_DAILY_POINTS = 200;

// ---=== BYPASS: LOGIQUE SANS PRISMA ===---
// Cette action est simulée et n'affecte aucune base de données.
export async function trackStudentActivity(activeSeconds: number) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    
    if (!userId || session?.user?.role !== 'ELEVE') {
      console.log('👤 [SERVEUR - Heartbeat] Action ignorée: Non-élève.');
      return { success: true, pointsAwarded: 0, reason: 'Not an authenticated student' };
    }
    
    console.log(`💓 [SERVEUR - Heartbeat] Ping Reçu (factice): Élève ${userId}.`);

    // La logique de transaction et de mise à jour de la base de données est supprimée.
    // On simule simplement l'attribution de points pour le logging.
    const pointsToAward = POINTS_PER_INTERVAL;
    console.log(`💰 [SERVEUR - Heartbeat] Effet (factice): +${pointsToAward} points pour ${userId}.`);

    return { 
      success: true, 
      pointsAwarded: pointsToAward,
      dailyPoints: (Math.random() * 100) + pointsToAward // Valeur factice
    };

  } catch (error) {
    console.error('❌ [SERVEUR - Heartbeat] Erreur:', error);
    throw new Error('Failed to track activity.');
  }
}
