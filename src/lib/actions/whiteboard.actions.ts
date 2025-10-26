// src/lib/actions/whiteboard.actions.ts
'use server';

import { pusherTrigger } from '@/lib/pusher/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { revalidatePath } from 'next/cache';
import { TLEditorSnapshot } from '@tldraw/tldraw';


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

export async function shareDocument(
  sessionId: string,
  document: { name: string; url: string }
) {
  console.log(`📄 [ACTION DOCUMENT] - Partage du document '${document.name}' pour la session ${sessionId}`);
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      throw new Error("Utilisateur non authentifié.");
    }
    
    if (!sessionId || !document?.url || !document?.name) {
      throw new Error('sessionId et document (name, url) sont requis.');
    }

    let finalUrl = document.url;

    // Si c'est un PDF, on modifie l'URL Cloudinary pour forcer le lien direct
    if (document.name.toLowerCase().endsWith('.pdf')) {
        const parts = document.url.split('/upload/');
        if (parts.length === 2) {
            finalUrl = `${parts[0]}/upload/fl_attachment/${parts[1]}`;
            console.log(`   -> URL de PDF modifiée pour lien direct: ${finalUrl}`);
        }
    }


    const channel = `presence-session-${sessionId}`;
    const payload = {
      name: document.name,
      url: finalUrl,
      sharedBy: session.user.name,
      timestamp: new Date().toISOString(),
    };
    
    // On diffuse l'événement 'document-shared'
    await pusherTrigger(channel, 'document-shared', payload);
    
    return { success: true };
    
  } catch (error) {
      console.error('💥 [ACTION DOCUMENT] - Erreur détaillée:', error);
      console.error('💥 Stack:', error instanceof Error ? error.stack : 'No stack');
      throw new Error(`Impossible de partager le document: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
}
