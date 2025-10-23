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

// Wrapper function to handle Pusher logic.
// It will silently fail in development if credentials are not set,
// which is the desired behavior for simulation.
export async function pusherTrigger(channel: string, event: string, data: any) {
  try {
    await pusherServer.trigger(channel, event, data);
  } catch (error) {
    console.error(`🔴 [PUSHER SERVER ERROR] Failed to trigger event on channel ${channel}:`, error);
    // In simulation mode, we just log the error and continue.
  }
}

// These functions are kept for API compatibility with the client-side auth endpoint.
export async function authorizeChannel(socketId: string, channelName: string) {
    const channelData = { user_id: 'simulated-user' }; // Dummy data
    return pusherServer.authorizeChannel(socketId, channelName, channelData);
}

export async function authenticateUser(socketId: string, user: any) {
    return pusherServer.authenticateUser(socketId, user);
}
