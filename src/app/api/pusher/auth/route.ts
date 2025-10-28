// src/app/api/pusher/auth/route.ts
import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { authenticateUser } from '@/lib/pusher/server';

export async function POST(request: Request) {
  console.log('🚪 [API PUSHER AUTH] - Requête d\'authentification reçue.');
  
  try {
    const formData = await request.formData();
    const socketId = formData.get('socket_id') as string;
    const channel = formData.get('channel_name') as string;

    console.log(`  Socket ID: ${socketId}, Channel: ${channel}`);

    if (!socketId || !channel) {
      console.error('❌ [API PUSHER AUTH] - socket_id ou channel_name manquant dans la requête.');
      return new NextResponse('Bad Request: socket_id and channel_name are required', { status: 400 });
    }
    
    const session = await auth();

    if (!session || !session.user) {
      console.error('❌ [API PUSHER AUTH] - Aucune session utilisateur trouvée. Accès refusé.');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { user } = session;
    console.log(`✅ [API PUSHER AUTH] - Session trouvée pour: ${user.name} (ID: ${user.id})`);

    const userData = {
      user_id: user.id!,
      user_info: {
        name: user.name!,
        role: user.role!,
        image: user.image,
      },
    };
    
    console.log('  Préparation des données utilisateur pour Pusher:', userData);
    const authResponse = await authenticateUser(socketId, channel, userData);
    console.log('✅ [API PUSHER AUTH] - Autorisation réussie pour le canal', channel);
    
    return NextResponse.json(authResponse);

  } catch (error) {
    console.error('💥 [API PUSHER AUTH] - Erreur interne:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Handler OPTIONS pour les requêtes CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
