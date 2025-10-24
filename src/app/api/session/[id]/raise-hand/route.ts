// src/app/api/session/[id]/raise-hand/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { updateStudentSessionStatus } from '@/lib/actions/session.actions';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id;
  console.log(`✋ [API RAISE-HAND] - Requête reçue pour la session ${sessionId}`);
  try {
    const body = await request.json();
    const { userId, isRaised } = body;
    console.log(`  Payload: userId=${userId}, isRaised=${isRaised}`);

    if (userId === undefined || isRaised === undefined) {
      console.error('❌ [API RAISE-HAND] - Paramètres manquants: userId et isRaised sont requis.');
      return new NextResponse('userId and isRaised are required', { status: 400 });
    }
    
    const { pusherTrigger } = await import('@/lib/pusher/server');
    const channel = `presence-session-${sessionId}`;
    console.log(`  Déclenchement de l'événement 'hand-raise-update' sur le canal ${channel}`);
    await pusherTrigger(channel, 'hand-raise-update', { userId, isRaised });

    console.log('✅ [API RAISE-HAND] - Événement diffusé avec succès.');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`💥 [API RAISE-HAND] - Erreur interne pour la session ${sessionId}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
