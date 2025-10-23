// src/app/api/pusher/auth/route.ts
import { authenticateUser } from '@/lib/pusher/server';
import { getAuthSession } from '@/lib/session';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  console.log('--- 🔐 [PUSHER AUTH] - Début du processus d\'authentification ---');
  try {
    const session = await getAuthSession();
    
    if (!session?.user?.id) {
      console.error('❌ [PUSHER AUTH] - Non autorisé: session ou ID utilisateur manquant.');
      return new NextResponse('Unauthorized', { status: 401 });
    }
    console.log(`🙋 [PUSHER AUTH] - Session utilisateur trouvée: ${session.user.name} (${session.user.id})`);

    const body = await request.formData();
    const socketId = body.get('socket_id') as string;
    const channel = body.get('channel_name') as string;
    console.log(`📡 [PUSHER AUTH] - Infos reçues: socketId=${socketId}, channel=${channel}`);

    // Les données utilisateur sont requises pour les canaux de présence.
    const userData = {
      id: session.user.id,
      user_info: {
        name: session.user.name,
        role: session.user.role,
      },
    };
    
    console.log('👤 [PUSHER AUTH] - Préparation des données utilisateur pour Pusher:', userData);
    
    const authResponse = await authenticateUser(socketId, userData);
    
    console.log('✅ [PUSHER AUTH] - Authentification réussie. Réponse envoyée au client.');
    return NextResponse.json(authResponse);

  } catch (error) {
    console.error('💥 [PUSHER AUTH] - Erreur interne du serveur:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
