// src/app/api/session/[id]/understanding/route.ts
import { pusherServer } from '@/lib/pusher/server';
import { getAuthSession } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionId = params.id;
  
  try {
    const { userId, status } = await request.json();

    if (!sessionId || !userId || !status) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Optional: Security check to ensure user is in the session
    const participant = await prisma.coursSession.findFirst({
        where: {
            id: sessionId,
            participants: { some: { id: session.user.id } }
        }
    });

    if (!participant) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const channel = `presence-session-${sessionId}`;
    
    await pusherServer.trigger(channel, 'understanding-status-updated', { userId, status });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('💥 [Understanding API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
