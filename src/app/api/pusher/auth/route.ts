// src/app/api/pusher/auth/route.ts
import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/session';
import { authenticateUser } from '@/lib/pusher/server';
import { Role } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = await request.formData();
    const socketId = body.get('socket_id') as string;
    const channel = body.get('channel_name') as string;

    const session = await getAuthSession();

    if (!session || !session.user) {
        console.error('❌ [PUSHER AUTH] - Échec : Aucune session utilisateur trouvée.');
        return new NextResponse('Unauthorized', { status: 403 });
    }

    const { user } = session;
    console.log(`✅ [PUSHER AUTH] - Session trouvée pour: ${user.name} (ID: ${user.id})`);

    const userData = {
      user_id: user.id,
      user_info: {
        name: user.name,
        role: user.role,
      },
    };
    
    const authResponse = await authenticateUser(socketId, channel, userData);
    console.log('✅ [PUSHER AUTH] - Autorisation réussie. Réponse envoyée au client.');
    
    return NextResponse.json(authResponse);

  } catch (error) {
    console.error('💥 [PUSHER AUTH] - Erreur interne du serveur:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
