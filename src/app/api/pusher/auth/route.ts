// src/app/api/pusher/auth/route.ts
import { authenticateUser } from "@/lib/pusher/server";
import { NextResponse } from "next/server";
import { Role } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.formData();
    const socketId = body.get('socket_id') as string;
    const channel = body.get('channel_name') as string;

    // ---=== BYPASS DE SIMULATION FIABILISÉ ===---
    // En mode démo, on authentifie systématiquement l'utilisateur
    // avec des données factices mais valides pour éviter les AuthError.
    // L'objet doit contenir user_id (string) et user_info (object).
    const userData = {
      user_id: `user-id-${Math.random().toString(36).substring(7)}`,
      user_info: {
        name: 'Utilisateur Démo',
        role: Role.ELEVE, // Rôle par défaut pour la simulation
      },
    };
    
    const authResponse = await authenticateUser(socketId, channel, userData);
    
    return NextResponse.json(authResponse);

  } catch (error) {
    console.error('💥 [PUSHER AUTH] - Erreur interne du serveur:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
