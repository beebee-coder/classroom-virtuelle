// src/lib/actions/whiteboard.actions.ts - CORRECTION
import { TLStoreSnapshot } from '@tldraw/tldraw';

export async function broadcastWhiteboardUpdate(
  sessionId: string, 
  snapshot: TLStoreSnapshot, 
  senderId: string
) {
  try {
    await fetch('/api/pusher/whiteboard-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        snapshot,
        senderId
      })
    });
  } catch (error) {
    console.error('Erreur diffusion tableau blanc:', error);
  }
}