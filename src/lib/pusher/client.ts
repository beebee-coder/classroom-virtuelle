// src/lib/pusher/client.ts
'use client';
import PusherClient from 'pusher-js';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Fallback to a dummy key if the real key is not set.
const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY || 'dummy-key';
const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'mt1';

// This will prevent Pusher from throwing an error if the key is missing.
if (pusherKey === 'dummy-key') {
    console.warn('⚠️ [PUSHER CLIENT] - Clé Pusher manquante. Initialisation en mode silencieux. Les fonctionnalités temps réel seront inactives.');
}

// Initialize PusherClient. It will silently fail if the key is a dummy one,
// which is acceptable for simulation mode.
export const pusherClient = new PusherClient(pusherKey, {
  cluster: pusherCluster,
  authEndpoint: '/api/pusher/auth',
  forceTLS: true,
  enabledTransports: ['ws', 'wss'],
});
