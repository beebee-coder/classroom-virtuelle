// src/app/api/pusher/auth/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authenticateUser } from '@/lib/pusher/server';
import { authOptions } from '@/lib/auth-options';

export async function POST(request: Request) {
  console.log('🚪 [API PUSHER AUTH] - Requête d\'authentification reçue.');
  
  try {
    // Vérification que la requête contient du JSON
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('❌ [API PUSHER AUTH] - Content-Type must be application/json');
      return new NextResponse('Content-Type must be application/json', { status: 400 });
    }

    const body = await request.json();
    const { socket_id: socketId, channel_name: channel } = body;
    console.log(`  Socket ID: ${socketId}, Channel: ${channel}`);

    if (!socketId || !channel) {
      console.error('❌ [API PUSHER AUTH] - socket_id ou channel_name manquant');
      return new NextResponse('Bad Request: socket_id and channel_name are required', { status: 400 });
    }
    
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      console.error('❌ [API PUSHER AUTH] - Aucune session utilisateur trouvée');
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
    console.log('✅ [API PUSHER AUTH] - Autorisation réussie');
    
    return NextResponse.json(authResponse);

  } catch (error) {
    console.error('💥 [API PUSHER AUTH] - Erreur interne:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Ajout d'un handler OPTIONS pour CORS si nécessaire
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