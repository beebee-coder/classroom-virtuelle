// src/app/api/session/[id]/raise-hand/route.ts
// ALTERNATIVE AVEC TIMEOUT CONTRÔLÉ
import { NextRequest, NextResponse } from 'next/server';
import { ablyTrigger } from '@/lib/ably/triggers';
import { getSessionChannelName } from '@/lib/ably/channels';
import { AblyEvents } from '@/lib/ably/events';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id;
  const startTime = Date.now();
  console.log(`✋ [API RAISE-HAND] - Requête reçue pour la session ${sessionId}`);
  
  try {
    const body = await request.json();
    const { userId, isRaised } = body;
    console.log(`  Payload: userId=${userId}, isRaised=${isRaised}`);

    if (userId === undefined || isRaised === undefined) {
      console.error('❌ [API RAISE-HAND] - Paramètres manquants: userId et isRaised sont requis.');
      return new NextResponse('userId and isRaised are required', { status: 400 });
    }
    
    const channelName = getSessionChannelName(sessionId);
    console.log(`  Déclenchement de l'événement '${AblyEvents.HAND_RAISE_UPDATE}' sur le canal ${channelName}`);
    
    // CORRECTION: Timeout de 2 secondes maximum pour Ably
    const ablyPromise = ablyTrigger(channelName, AblyEvents.HAND_RAISE_UPDATE, { userId, isRaised });
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Ably timeout')), 2000)
    );

    try {
      // Attendre Ably avec timeout
      const success = await Promise.race([ablyPromise, timeoutPromise]);
      
      if (success) {
        console.log(`✅ [API RAISE-HAND] - Événement diffusé avec succès via Ably. (${Date.now() - startTime}ms)`);
      } else {
        console.warn(`⚠️ [API RAISE-HAND] - Échec de la diffusion Ably, mais réponse envoyée. (${Date.now() - startTime}ms)`);
      }
    } catch (timeoutError) {
      console.warn(`⏰ [API RAISE-HAND] - Timeout Ably, réponse envoyée de toute façon. (${Date.now() - startTime}ms)`);
      // Continuer même en cas de timeout - l'événement peut quand même être traité
    }

    // Répondre dans tous les cas (succès, échec ou timeout)
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error(`💥 [API RAISE-HAND] - Erreur interne pour la session ${sessionId}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}