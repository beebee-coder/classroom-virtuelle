// src/app/api/pusher/auth/route.ts
import { pusherServer } from '@/lib/pusher/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.formData();
    const socketId = body.get('socket_id') as string;
    const channel = body.get('channel_name') as string;

    // ---=== BYPASS D'AUTH POUR LA DÉMO ===---
    // Pour la simulation, nous créons un utilisateur factice basé sur le socketId
    // pour l'authentification de présence. Dans une vraie app, on utiliserait la session.
    const userData = {
      id: `user-${socketId}-${Date.now()}`,
      user_info: {
        name: 'Utilisateur de Démo',
        role: 'ELEVE' // Rôle par défaut pour la démo
      }
    };
    
    // Pour les canaux de présence, les données utilisateur sont requises
    const authResponse = await pusherServer.authenticateUser(socketId, userData.user_info);
    
    return NextResponse.json(authResponse);

  } catch (error) {
    console.error('[PUSHER_AUTH_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
