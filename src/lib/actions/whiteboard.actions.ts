// src/lib/actions/whiteboard.actions.ts
'use server';

import { pusherTrigger } from '@/lib/pusher/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options'; // CORRECTION: Importer depuis le fichier centralisé
import { revalidatePath } from 'next/cache';
import type { TLEditorSnapshot } from '@tldraw/tldraw';

/**
 * Diffuse les mises à jour de l'état du tableau blanc à tous les participants d'une session.
 * @param sessionId L'ID de la session.
 * @param snapshot Le snapshot (instantané) de l'état du tableau blanc à diffuser.
 */
export async function broadcastWhiteboardUpdate(sessionId: string, snapshot: any) {
  try {
    const session = await getServerSession(authOptions);
    
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
    const session = await getServerSession(authOptions);
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

export async function shareDocument(sessionId: string, document: { name: string; url: string }) {
  console.log(`📄 [ACTION DOCUMENT] - Partage du document '${document.name}' pour la session ${sessionId}`);
  
  try {
      // 🔍 DEBUG DÉTAILLÉ
      console.log('🔍 [ACTION DOCUMENT] - Vérification de la session...');
      const session = await getServerSession(authOptions);
      
      if (!session?.user) {
          console.error('❌ [ACTION DOCUMENT] - Utilisateur non authentifié - Session:', session);
          throw new Error('Unauthorized: No user session');
      }

      console.log('✅ [ACTION DOCUMENT] - Session trouvée:', session.user.name);
      
      if (!sessionId || !document?.url || !document?.name) {
          console.error('❌ [ACTION DOCUMENT] - Paramètres manquants:', { sessionId, document });
          throw new Error('sessionId et document (name, url) sont requis.');
      }

      const channel = `presence-session-${sessionId}`;
      const payload = {
          name: document.name,
          url: document.url,
          sharedBy: session.user.name,
          timestamp: new Date().toISOString(),
          newHistory: [], // La gestion de l'historique est maintenant côté client.
      };
      
      console.log(`📤 [ACTION DOCUMENT] - Tentative de diffusion sur le canal ${channel}...`);
      console.log('📦 Payload:', payload);
      
      await pusherTrigger(channel, 'document-updated', payload);
      
      console.log('✅ [ACTION DOCUMENT] - Document partagé avec succès!');
      return { success: true };
      
  } catch (error) {
      console.error('💥 [ACTION DOCUMENT] - Erreur détaillée:', error);
      console.error('💥 Stack:', error instanceof Error ? error.stack : 'No stack');
      throw new Error(`Impossible de partager le document: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
}
