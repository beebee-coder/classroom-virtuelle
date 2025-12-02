
// src/app/api/ably/signal/route.ts
import { ablyTrigger } from '@/lib/ably/triggers';
import { AblyEvents } from '@/lib/ably/events';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { socket_id, signal, userId, channelName, target } = body;
    console.log(`📡 [API SIGNAL ABLY] - Signal WebRTC reçu de ${userId} pour ${target} sur ${channelName}`);
    
    // Déclencher l'événement sur le canal vers la cible
    await ablyTrigger(channelName, AblyEvents.SIGNAL, {
      userId: userId, // Qui envoie le signal
      target: target,
      signal: signal,
    });
    
    console.log(`✅ [API SIGNAL ABLY] - Signal relayé avec succès de ${userId} à ${target}`);
    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('💥 [API SIGNAL ABLY] - Erreur lors du relais du signal:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

    