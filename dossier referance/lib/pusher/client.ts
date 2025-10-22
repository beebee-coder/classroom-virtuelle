// lib/pusher/client.ts
'use client';
import PusherClient from 'pusher-js';

const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

if (!pusherKey) {
  throw new Error('NEXT_PUBLIC_PUSHER_KEY is required');
}

export const pusherClient = new PusherClient(pusherKey, {
  cluster: pusherCluster || 'mt1',
  authEndpoint: '/api/pusher/auth',
});
