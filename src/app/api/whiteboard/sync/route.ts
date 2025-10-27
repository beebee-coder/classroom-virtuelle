// src/app/api/whiteboard/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

const WHITEBOARD_SNAPSHOT_KEY = (roomId: string) => `whiteboard:${roomId}:snapshot`;

// Handler pour récupérer le dernier snapshot connu
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId');

  if (!roomId) {
    return NextResponse.json({ error: 'roomId required' }, { status: 400 });
  }
  
  if (!redis) {
    return NextResponse.json({ error: 'Redis not configured' }, { status: 500 });
  }

  try {
    const snapshotJson = await redis.get(WHITEBOARD_SNAPSHOT_KEY(roomId));
    if (snapshotJson) {
      return NextResponse.json(JSON.parse(snapshotJson));
    }
    return NextResponse.json(null); // Pas de snapshot encore sauvegardé
  } catch (error) {
    console.error(`💥 [API SYNC GET] - Erreur pour la room ${roomId}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Handler pour publier les mises à jour du tableau blanc (sera remplacé par la route de session)
export async function POST(request: NextRequest) {
  try {
    const { roomId, snapshot } = await request.json();

    if (!roomId || !snapshot) {
      return NextResponse.json({ error: 'roomId and snapshot required' }, { status: 400 });
    }
    
    if (!redis) {
      return NextResponse.json({ error: 'Redis not configured' }, { status: 500 });
    }

    // Publier l'événement sur le canal Redis Pub/Sub
    // Le redis-subscriber se chargera de le relayer à Pusher
    await redis.publish(`whiteboard-channel-${roomId}`, JSON.stringify({ snapshot }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving whiteboard snapshot:', error);
    return NextResponse.json({ error: 'Failed to save snapshot' }, { status: 500 });
  }
}
