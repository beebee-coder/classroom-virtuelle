// src/lib/pusher/client.ts
'use client';
import PusherClient from 'pusher-js';

// Fallback to a dummy key if the real key is not set.
const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY || 'dummy-key';
const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'mt1';
const isPusherConfigured = pusherKey !== 'dummy-key';

if (!isPusherConfigured) {
    console.warn('⚠️ [PUSHER CLIENT] - Clé Pusher manquante. Les fonctionnalités temps réel seront inactives.');
}

// Initialize PusherClient. It will silently fail if the key is a dummy one,
// which is acceptable for simulation mode.
export const pusherClient = new PusherClient(pusherKey, {
  cluster: pusherCluster,
  authEndpoint: '/api/pusher/auth',
  forceTLS: true,
  enabledTransports: ['ws', 'wss'],
  // Si Pusher n'est pas configuré, on désactive le client pour éviter les erreurs.
  // @ts-ignore - enabled est une option non documentée mais utile
  enabled: isPusherConfigured,
});
