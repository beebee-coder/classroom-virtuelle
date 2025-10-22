// src/app/api/pusher/signal/route.ts
import { pusherTrigger } from '@/lib/pusher/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { socket_id, signal, userId, channelName, target } = body;

    // Déclencher l'événement sur le canal vers la cible
    await pusherTrigger(channelName, 'signal', {
      userId: userId, // Qui envoie le signal
      target: target,
      signal: signal,
    }, { socket_id: socket_id });

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('[PUSHER_SIGNAL_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
