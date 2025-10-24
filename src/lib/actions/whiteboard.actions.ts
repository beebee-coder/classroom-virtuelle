// src/lib/actions/whiteboard.actions.ts
'use server';

import { pusherTrigger } from '@/lib/pusher/server';
import { getAuthSession } from '../session';
import { revalidatePath } from 'next/cache';

/**
 * Diffuse les mises à jour de l'état du tableau blanc à tous les participants d'une session.
 * @param sessionId L'ID de la session.
 * @param snapshot Le snapshot (instantané) de l'état du tableau blanc à diffuser.
 */
export async function broadcastWhiteboardUpdate(sessionId: string, snapshot: any) {
  try {
    const session = await getAuthSession();
    
    if (!session?.user) {
      console.error('❌ [ACTION WHITEBOARD] - Tentative de diffusion non autorisée (pas de session).');
      throw new Error('Unauthorized');
    }

    const channelName = `presence-session-${sessionId}`;
    const eventName = 'whiteboard-update';

    console.log(`🎨 [ACTION WHITEBOARD] - Diffusion des données du tableau blanc par ${session.user.id} sur le canal ${channelName}`);
    
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


/**
 * Diffuse le changement de contrôleur du tableau blanc.
 * @param sessionId L'ID de la session.
 * @param controllerId L'ID de l'utilisateur qui prend le contrôle.
 */
export async function broadcastWhiteboardController(sessionId: string, controllerId: string) {
  try {
    const session = await getAuthSession();
    if (session?.user?.role !== 'PROFESSEUR') {
      console.error('❌ [ACTION WHITEBOARD] - Seul le professeur peut changer le contrôleur.');
      throw new Error('Unauthorized');
    }

    const channelName = `presence-session-${sessionId}`;
    const eventName = 'whiteboard-controller-update';

    console.log(`🕹️ [ACTION WHITEBOARD] - Le professeur assigne le contrôle du tableau blanc à ${controllerId} sur le canal ${channelName}`);
    
    await pusherTrigger(channelName, eventName, {
      controllerId,
    });

    revalidatePath(`/session/${sessionId}`);
    return { success: true };

  } catch (error) {
    console.error('💥 [ACTION WHITEBOARD] - Erreur lors du changement de contrôleur:', error);
    return { success: false, error: 'Failed to change whiteboard controller' };
  }
}
