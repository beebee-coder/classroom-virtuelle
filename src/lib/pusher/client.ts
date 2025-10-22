// src/lib/pusher/client.ts - Vérifiez que c'est correct
'use client';
import PusherClient from 'pusher-js';

const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

if (!pusherKey) {
  console.warn('⚠️ [PUSHER CLIENT] - NEXT_PUBLIC_PUSHER_KEY non défini, utilisation du mode simulation');
  // Continuer en mode simulation
}

export const pusherClient = new PusherClient(pusherKey || 'simulation-key', {
  cluster: pusherCluster || 'mt1',
  authEndpoint: '/api/pusher/auth',
  // Options importantes pour le développement
  forceTLS: true,
  enabledTransports: ['ws', 'wss'],
});