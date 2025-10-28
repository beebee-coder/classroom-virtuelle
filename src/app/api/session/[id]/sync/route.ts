// src/app/api/session/[id]/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import getClient from '@/lib/redis';

const WHITEBOARD_SNAPSHOT_KEY = (sessionId: string) => `whiteboard:${sessionId}:snapshot`;
const WHITEBOARD_CHANNEL = (sessionId: string) => `whiteboard-channel-${sessionId}`;

// POST handler for publishing whiteboard updates
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id;
  const session = await auth();

  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 403 });
  }

  const redis = await getClient();
  if (!redis) {
      return new NextResponse('Redis not configured', { status: 500 });
  }

  try {
    const body = await request.json();
    const { snapshot, senderSocketId } = body;

    if (!snapshot) {
      return new NextResponse('Snapshot data is required', { status: 400 });
    }
    
    // Publier vers Redis Pub/Sub. Le service `redis-subscriber` écoutera cet événement.
    await redis.publish(WHITEBOARD_CHANNEL(sessionId), JSON.stringify({
        snapshot,
        senderSocketId: senderSocketId
    }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`💥 [API SYNC] - Erreur interne pour la session ${sessionId}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// GET handler for retrieving the last known snapshot
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const sessionId = params.id;
    const session = await auth();

    if (!session?.user) {
        return new NextResponse('Unauthorized', { status: 403 });
    }

    const redis = await getClient();
    if (!redis) {
        return new NextResponse('Redis not configured', { status: 500 });
    }
    
    try {
        const snapshotJson = await redis.get(WHITEBOARD_SNAPSHOT_KEY(sessionId));
        if (snapshotJson) {
            return NextResponse.json(JSON.parse(snapshotJson));
        }
        return NextResponse.json(null); // Pas de snapshot sauvegardé pour le moment
    } catch (error) {
        console.error(`💥 [API SYNC GET] - Erreur pour la session ${sessionId}:`, error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
