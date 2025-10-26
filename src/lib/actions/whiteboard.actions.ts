// src/lib/actions/whiteboard.actions.ts
'use server';

import { pusherTrigger } from '@/lib/pusher/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { revalidatePath } from 'next/cache';
import { TLEditorSnapshot, createTLStore, defaultShapeUtils, getSnapshot, AssetRecord, ShapeRecord, PageRecord, RecordId } from '@tldraw/tldraw';

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

    // Créer un snapshot tldraw avec l'image
    const store = createTLStore({ shapeUtils: defaultShapeUtils });

    // Idéaalement, on récupérerait les dimensions de l'image, mais pour l'instant, utilisons une taille par défaut.
    const imageWidth = 1080;
    const imageHeight = 720;
    
    const assetId: RecordId<any> = AssetRecord.createId();
    const shapeId: RecordId<any> = ShapeRecord.createId();
    const pageId: RecordId<any> = PageRecord.createId('page');

    store.put([
        AssetRecord.create({
            id: assetId,
            type: 'image',
            props: {
                w: imageWidth,
                h: imageHeight,
                name: document.name,
                isAnimated: false,
                mimeType: 'image/png', // Assumons png, pourrait être amélioré
                src: document.url,
            },
        }),
        ShapeRecord.create({
            id: shapeId,
            type: 'image',
            x: 100, // Centrer l'image
            y: 100,
            rotation: 0,
            index: 'a1',
            parentId: pageId,
            isLocked: false,
            props: {
                w: imageWidth,
                h: imageHeight,
                assetId: assetId,
                url: document.url,
            },
        }),
    ]);
    
    const snapshot = getSnapshot(store);


    const channel = `presence-session-${sessionId}`;
    const payload = {
      name: document.name,
      url: document.url,
      sharedBy: session.user.name,
      timestamp: new Date().toISOString(),
      snapshot, // Inclure le snapshot pour l'outil Document/tldraw
      newHistory: [], 
    };
    
    // On diffuse à la fois l'événement `document-updated` et `whiteboard-update`
    // pour que les clients sachent quel outil activer et aient le contenu.
    await pusherTrigger(channel, 'document-updated', payload);
    await pusherTrigger(channel, 'whiteboard-update', { senderId: session.user.id, snapshot });
    
    return { success: true };
    
  } catch (error) {
      console.error('💥 [ACTION DOCUMENT] - Erreur détaillée:', error);
      console.error('💥 Stack:', error instanceof Error ? error.stack : 'No stack');
      throw new Error(`Impossible de partager le document: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
}