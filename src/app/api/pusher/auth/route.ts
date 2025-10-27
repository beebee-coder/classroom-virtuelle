// src/app/api/pusher/auth/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authenticateUser } from '@/lib/pusher/server';
import { authOptions } from '@/lib/auth-options';

export async function POST(request: Request) {
  console.log('🚪 [API PUSHER AUTH] - Requête d\'authentification reçue.');
  try {
    // 💡 CORRECTION : Le client Pusher envoie les données en JSON, pas en formData.
    const body = await request.json();
    const { socket_id: socketId, channel_name: channel } = body;
    console.log(`  Socket ID: ${socketId}, Channel: ${channel}`);

    if (!socketId || !channel) {
        console.error('❌ [API PUSHER AUTH] - socket_id ou channel_name manquant dans le corps de la requête.');
        return new NextResponse('Bad Request', { status: 400 });
    }
    
    const session = await getServerSession(authOptions);

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
        image: user.image,
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
