// src/app/api/webrtc/signal/route.ts
import { pusherServer } from '@/lib/pusher/server';
import { getAuthSession } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { sessionId, toUserId, fromUserId, signal } = await request.json();

    if (!sessionId || !toUserId || !fromUserId || !signal) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }
    
    // VALIDATION CRITIQUE : S'assurer que le signal a un type
    if (!signal.type) {
      console.error('❌ [API] Signal invalide sans type:', signal);
      return NextResponse.json({ error: 'Signal invalide' }, { status: 400 });
    }

    // Le canal de la session est un canal de présence.
    const channel = `presence-session-${sessionId}`;
    const event = 'webrtc-signal';
    
    // Diffuser le signal à tous les clients du canal.
    // On envoie le signal ciblé à l'utilisateur 'toUserId'
    await pusherServer.trigger(channel, event, {
        fromUserId,
        toUserId,
        signal: {
          type: signal.type, // DOIT être défini
          // Inclure tous les champs possibles
          ...(signal.sdp && { sdp: signal.sdp }),
          ...(signal.candidate && { candidate: signal.candidate })
        }
    });

    console.log(`✅ [API] Signal ${signal.type} envoyé de ${fromUserId} vers ${toUserId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('💥 [WebRTC Signal API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
