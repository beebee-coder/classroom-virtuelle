// src/app/api/pusher/whiteboard-update/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher/server';
import { ExcalidrawScene } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, sceneData, senderId } = await request.json();

    if (!sessionId || !sceneData) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    }

    await pusherServer.trigger(
      `presence-session-${sessionId}`,
      'whiteboard-update',
      {
        sceneData: sceneData as ExcalidrawScene,
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
