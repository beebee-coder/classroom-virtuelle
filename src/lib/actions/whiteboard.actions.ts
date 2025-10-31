// src/lib/actions/whiteboard.actions.ts
import type { ExcalidrawScene } from '@/types';

export async function broadcastWhiteboardUpdate(
  sessionId: string, 
  sceneData: ExcalidrawScene, 
  senderId: string
) {
  try {
    await fetch('/api/pusher/whiteboard-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        sceneData,
        senderId
      })
    });
  } catch (error) {
    console.error('Erreur diffusion tableau blanc:', error);
  }
}
