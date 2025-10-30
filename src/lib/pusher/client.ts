// src/lib/pusher/client.ts
'use client';
import PusherClient from 'pusher-js';

// Fallback to a dummy key if the real key is not set.
const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY || 'dummy-key';
const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'mt1';
const isPusherConfigured = pusherKey !== 'dummy-key';

let pusherInstance: PusherClient | null = null;

if (!isPusherConfigured && typeof window !== 'undefined') {
    console.warn('⚠️ [PUSHER CLIENT] - Clé Pusher manquante. Les fonctionnalités temps réel seront inactives.');
}

// Lazy initialization of the Pusher client
export const getPusherClient = (): PusherClient => {
    if (!pusherInstance) {
        if (!isPusherConfigured) {
            // Return a mock client if not configured to prevent errors
            return {
                subscribe: () => ({
                    bind: () => {},
                    unbind: () => {},
                }),
                unsubscribe: () => {},
                bind: () => {},
                unbind: () => {},
                connection: {
                    socket_id: 'mock-socket-id',
                }
            } as any;
        }
        
        pusherInstance = new PusherClient(pusherKey, {
            cluster: pusherCluster,
            authEndpoint: '/api/pusher/auth',
            forceTLS: true,
            enabledTransports: ['ws', 'wss'],
        });
    }
    return pusherInstance;
};
