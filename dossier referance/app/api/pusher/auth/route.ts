// app/api/pusher/auth/route.ts
import { pusherServer } from '@/lib/pusher/server';
import { getAuthSession } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.formData();
    const socketId = data.get('socket_id') as string;
    const channelName = data.get('channel_name') as string;


    if (!socketId || !channelName) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }
    
    // Generic authorization for any presence channel
    if (channelName.startsWith('presence-')) {
       const userData = {
        user_id: session.user.id,
        user_info: {
          name: session.user.name || 'Utilisateur',
          email: session.user.email || 'user@example.com',
          user_id: session.user.id, // Add user_id here as well
        },
      };
      // TODO: Add verification logic to ensure the user is allowed in this specific channel
      // e.g., for presence-classe-xyz, check if user is in classe xyz.
      const authResponse = pusherServer.authorizeChannel(socketId, channelName, userData);
      return NextResponse.json(authResponse);
    }
    
    // Autorisation pour les canaux privés (conversations directes, signalisation WebRTC)
    if (channelName.startsWith('private-')) {
      // Pour la signalisation WebRTC, nous avons besoin d'un canal privé mais pas d'une logique d'autorisation complexe
      // Pour les conversations, une logique plus stricte serait nécessaire en production.
      const authResponse = pusherServer.authorizeChannel(socketId, channelName);
      return NextResponse.json(authResponse);
    }

    // Si le canal n'est ni `presence-` ni `private-`, refuser l'accès.
    return NextResponse.json({ error: 'Invalid channel type' }, { status: 403 });

  } catch (error) {
    console.error('💥 [Pusher Auth] Internal Server Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
