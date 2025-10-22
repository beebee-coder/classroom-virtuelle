// src/app/api/pusher/auth/route.ts
import { authenticateUser } from '@/lib/pusher/server';
import { getAuthSession } from '@/lib/session';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  console.log('--- 🔐 [PUSHER AUTH] - Début du processus d\'authentification ---');
  try {
    const session = await getAuthSession();
    console.log('🔐 [PUSHER AUTH] - Session récupérée:', session ? { user: session.user } : 'null');
    
    if (!session?.user?.id) {
      console.error('❌ [PUSHER AUTH] - Non autorisé: session ou ID utilisateur manquant.');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.formData();
    const socketId = body.get('socket_id') as string;
    const channel = body.get('channel_name') as string;
    console.log('🔐 [PUSHER AUTH] - Infos reçues:', { socketId, channel });


    const userData = {
      id: session.user.id, // ID critique pour la présence
      user_info: {
        name: session.user.name,
        role: session.user.role,
      },
    };
    
    console.log('🔐 [PUSHER AUTH] - Préparation des données utilisateur pour Pusher:', userData);
    
    // Pour les canaux de présence, les données utilisateur sont requises
    const authResponse = await authenticateUser(socketId, userData);
    
    console.log('✅ [PUSHER AUTH] - Authentification réussie. Réponse envoyée au client.');
    return NextResponse.json(authResponse);

  } catch (error) {
    console.error('❌ [PUSHER AUTH] - Erreur interne du serveur:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
