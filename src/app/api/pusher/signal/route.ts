// src/app/api/pusher/signal/route.ts
import { pusherServer } from '@/lib/pusher/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // ---=== BYPASS D'AUTH POUR LA DÉMO ===---
    // La vérification de session est retirée pour permettre la simulation
    // entre un navigateur normal et une fenêtre de navigation privée.
    
    const body = await request.json();
    const { socket_id, signal, userId, channelName } = body;

    // On déclenche l'événement sur le canal avec les données reçues.
    // L'ID de l'appelant (userId) est déjà dans le corps de la requête.
    await pusherServer.trigger(channelName, 'signal', {
      userId: userId, // Qui envoie le signal
      signal: signal,
    }, { socket_id: socket_id });

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('[PUSHER_SIGNAL_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
