// src/lib/actions/whiteboard.actions.ts
'use server';

import { pusherTrigger } from '@/lib/pusher/server';
import { getAuthSession } from '../session';

/**
 * Diffuse les mises à jour de l'état du tableau blanc à tous les participants d'une session.
 * @param sessionId L'ID de la session.
 * @param snapshot Le snapshot (instantané) de l'état du tableau blanc à diffuser.
 */
export async function broadcastWhiteboardUpdate(sessionId: string, snapshot: any) {
  try {
    const session = await getAuthSession();
    
    // Seul le professeur peut diffuser des mises à jour du tableau blanc
    if (!session?.user || session.user.role !== 'PROFESSEUR') {
      console.error('❌ [ACTION WHITEBOARD] - Tentative de diffusion non autorisée.');
      throw new Error('Unauthorized');
    }

    const channelName = `presence-session-${sessionId}`;
    const eventName = 'whiteboard-update';

    console.log(`🎨 [ACTION WHITEBOARD] - Diffusion des données du tableau blanc sur le canal ${channelName}`);
    
    await pusherTrigger(channelName, eventName, {
      senderId: session.user.id,
      snapshot: snapshot,
    });

    return { success: true };
  } catch (error) {
    console.error('💥 [ACTION WHITEBOARD] - Erreur lors de la diffusion des mises à jour :', error);
    return { success: false, error: 'Failed to broadcast whiteboard update' };
  }
}
