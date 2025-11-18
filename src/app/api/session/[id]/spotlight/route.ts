
// src/app/api/session/[id]/spotlight/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { spotlightParticipant } from '@/lib/actions/session.actions';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id;
  console.log(`🌟 [API SPOTLIGHT] - Requête reçue pour la session ${sessionId}`);
  try {
    const body = await request.json();
    const { participantId } = body;
    console.log(`  Mise en vedette demandée pour: ${participantId}`);

    if (!participantId) {
      console.error('❌ [API SPOTLIGHT] - participantId est requis.');
      return new NextResponse('participantId is required', { status: 400 });
    }

    // Utiliser l'action serveur existante pour déclencher l'événement Pusher
    await spotlightParticipant(sessionId, participantId);
    
    console.log('✅ [API SPOTLIGHT] - Événement de mise en vedette diffusé.');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`💥 [API SPOTLIGHT] - Erreur lors du spotlight pour la session ${sessionId}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

    