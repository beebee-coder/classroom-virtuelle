// src/app/api/pusher/auth/route.ts
import { authenticateUser } from '@/lib/pusher/server';
import { getAuthSession } from '@/lib/session';
import { NextResponse } from 'next/server';
import { Role } from '@/lib/types';

export async function POST(request: Request) {
  console.log('--- 🔐 [PUSHER AUTH] - Début du processus d\'authentification ---');
  try {
    // ---=== BYPASS DE LA SESSION POUR LA DÉMO ===---
    // En mode bypass, la session peut ne pas être fiable. On simule un utilisateur.
    const session = await getAuthSession();
    
    const userId = session?.user?.id || `user-id-${Math.random()}`;
    const userName = session?.user?.name || 'Utilisateur Démo';
    const userRole = session?.user?.role || Role.ELEVE;

    console.log(`🙋 [PUSHER AUTH] - Session utilisateur (simulée/réelle): ${userName} (${userId})`);
    // ---===========================================---

    const body = await request.formData();
    const socketId = body.get('socket_id') as string;
    const channel = body.get('channel_name') as string;
    console.log(`📡 [PUSHER AUTH] - Infos reçues: socketId=${socketId}, channel=${channel}`);

    // Les données utilisateur sont requises pour les canaux de présence.
    const userData = {
      id: userId,
      user_info: {
        name: userName,
        role: userRole,
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
