// src/lib/pusher/server.ts
'use server';

import Pusher from 'pusher';

const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

export async function pusherTrigger(channel: string, event: string, data: any, options?: { socket_id?: string }) {
    try {
        await pusherServer.trigger(channel, event, data, options);
    } catch (error) {
        console.error(`🔴 [PUSHER SERVER ERROR] Failed to trigger event on channel ${channel}:`, error);
        // Ne pas relancer l'erreur en production pour ne pas casser la requête, mais la loguer.
        // En développement, une erreur ici indique un problème de configuration.
    }
}

export async function authenticateUser(socketId: string, userData: { id: string, user_info: object }) {
    return pusherServer.authenticateUser(socketId, userData);
}
