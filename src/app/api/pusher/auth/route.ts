// src/app/api/pusher/auth/route.ts
import { pusherServer } from '@/lib/pusher/server';
import { getAuthSession } from '@/lib/session';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.formData();
    const socketId = body.get('socket_id') as string;
    const channel = body.get('channel_name') as string;

    const userData = {
      id: session.user.id,
      user_info: {
        name: session.user.name,
        role: session.user.role,
      },
    };
    
    // Pour les canaux de présence, les données utilisateur sont requises
    const authResponse = await pusherServer.authenticateUser(socketId, userData);
    
    return NextResponse.json(authResponse);

  } catch (error) {
    console.error('[PUSHER_AUTH_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
