// src/app/api/session/[id]/raise-hand/route.ts
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
    const { userId, isRaised } = await request.json();

    if (!sessionId || typeof isRaised !== 'boolean' || !userId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Security check: ensure the user is a participant of the session
    const participant = await prisma.coursSession.findFirst({
        where: {
            id: sessionId,
            participants: {
                some: { id: session.user.id }
            }
        }
    });

    if (!participant) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const channel = `presence-session-${sessionId}`;
    
    await pusherServer.trigger(channel, 'hand-raise-toggled', { userId, isRaised });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('💥 [Hand Raise API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
