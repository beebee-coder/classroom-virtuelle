
import { authenticateUser } from "@/lib/pusher/server";
import { getAuthSession } from "@/lib/session";
import { Role } from "@/lib/types";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  console.log('--- 🔐 [PUSHER AUTH] - Début du processus d\'authentification ---');
  try {
    
    const session = await getAuthSession();
    
    // Pour la démo, on utilise des valeurs de secours si la session n'est pas trouvée
    const userId = session?.user?.id || `user-id-${Math.random().toString(36).substring(7)}`;
    const userName = session?.user?.name || 'Utilisateur Démo';
    const userRole = session?.user?.role || Role.ELEVE;

    console.log(`🙋 [PUSHER AUTH] - Session utilisateur (simulée/réelle): ${userName} (${userId})`);

    const body = await request.formData();
    const socketId = body.get('socket_id') as string;
    const channel = body.get('channel_name') as string;
    console.log(`📡 [PUSHER AUTH] - Infos reçues: socketId=${socketId}, channel=${channel}`);

    // Structure correcte pour les canaux de présence Pusher
    const userData = {
      id: userId,
      user_info: {
        name: userName,
        role: userRole,
      },
    };
    
    console.log('👤 [PUSHER AUTH] - Préparation des données utilisateur pour Pusher:', userData);
    
    const authResponse = await authenticateUser(socketId, channel, userData);
    
    console.log('✅ [PUSHER AUTH] - Authentification réussie. Réponse envoyée au client.');
    return NextResponse.json(authResponse);

  } catch (error) {
    console.error('💥 [PUSHER AUTH] - Erreur interne du serveur:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
