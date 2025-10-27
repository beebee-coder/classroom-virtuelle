// src/app/api/pusher/whiteboard-update/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher/server';
import { TLStoreSnapshot } from '@tldraw/tldraw';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, snapshot, senderId } = await request.json();

    // Diffuser la mise à jour à tous les participants sauf l'émetteur
    await pusherServer.trigger(
      `presence-session-${sessionId}`,
      'whiteboard-update',
      {
        snapshot: snapshot as TLStoreSnapshot,
        senderId,
        timestamp: new Date().toISOString()
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur diffusion whiteboard:', error);
    return NextResponse.json({ error: 'Échec diffusion' }, { status: 500 });
  }
}