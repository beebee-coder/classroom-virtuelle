// src/app/api/ably/trigger/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getServerAblyClient } from '@/lib/ably/server';

interface TriggerRequest {
  channel: string | string[];
  eventName: string;
  data: any;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authentifier la requête
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // 2. Parser le corps de la requête
    const body: TriggerRequest = await request.json();
    const { channel, eventName, data } = body;

    if (!channel || !eventName) {
      return NextResponse.json({ error: 'Channel et eventName sont requis' }, { status: 400 });
    }

    // 3. Obtenir le client Ably côté serveur
    const ablyServer = await getServerAblyClient();
    if (!ablyServer) {
        throw new Error("Le client Ably côté serveur n'a pas pu être initialisé.");
    }
    
    const channels = Array.isArray(channel) ? channel : [channel];
    
    // 4. Publier les événements
    const publishPromises = channels.map(ch => 
      ablyServer.channels.get(ch).publish(eventName, data)
    );

    await Promise.all(publishPromises);

    console.log(`✅ [API ABLY TRIGGER] - Event '${eventName}' publié sur ${channels.length} canal(s)`);
    
    return NextResponse.json({ 
      success: true, 
      channels: channels.length,
      event: eventName 
    });

  } catch (error) {
    console.error('❌ [API ABLY TRIGGER] - Erreur:', error);
    const errorMessage = error instanceof Error ? error.message : 'Échec du déclenchement Ably';
    return NextResponse.json(
      { error: errorMessage }, 
      { status: 500 }
    );
  }
}