// src/app/api/pusher/auth/route.ts
import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/session';
import { authenticateUser } from '@/lib/pusher/server';
import type { Role } from '@prisma/client';

export async function POST(request: Request) {
  console.log('🚪 [API PUSHER AUTH] - Requête d\'authentification reçue.');
  try {
    const body = await request.formData();
    const socketId = body.get('socket_id') as string;
    const channel = body.get('channel_name') as string;
    console.log(`  Socket ID: ${socketId}, Channel: ${channel}`);

    const session = await getAuthSession();

    if (!session || !session.user) {
        console.error('❌ [API PUSHER AUTH] - Échec : Aucune session utilisateur trouvée.');
        return new NextResponse('Unauthorized', { status: 403 });
    }

    const { user } = session;
    console.log(`✅ [API PUSHER AUTH] - Session trouvée pour: ${user.name} (ID: ${user.id})`);

    const userData = {
      user_id: user.id,
      user_info: {
        name: user.name,
        role: user.role,
      },
    };
    
    console.log('  Préparation des données utilisateur pour Pusher:', userData);
    const authResponse = await authenticateUser(socketId, channel, userData);
    console.log('✅ [API PUSHER AUTH] - Autorisation réussie. Réponse envoyée au client.');
    
    return NextResponse.json(authResponse);

  } catch (error) {
    console.error('💥 [API PUSHER AUTH] - Erreur interne du serveur:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
