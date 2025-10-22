// src/app/api/trigger-card/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { isActive } = await request.json();

    // Broadcast à toutes les classes
    const classrooms = await prisma.classroom.findMany({
      select: { id: true }
    });

    const events = classrooms.map(classroom => ({
        channel: `presence-classe-${classroom.id}`,
        name: 'card-trigger',
        data: { isActive }
    }));
    
    if (events.length > 0) {
        await pusherServer.triggerBatch(events);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error triggering card:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
