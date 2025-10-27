// src/lib/pusher/server.ts
'use server';

import Pusher from 'pusher';

const isPusherConfigured = 
    process.env.PUSHER_APP_ID &&
    process.env.NEXT_PUBLIC_PUSHER_KEY &&
    process.env.PUSHER_SECRET &&
    process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

let pusherServer: Pusher;

if (isPusherConfigured) {
    pusherServer = new Pusher({
        appId: process.env.PUSHER_APP_ID!,
        key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
        secret: process.env.PUSHER_SECRET!,
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        useTLS: true,
    });
    console.log("✅ [PUSHER SERVER] - Client Pusher initialisé avec succès.");
} else {
    console.warn("⚠️ [PUSHER SERVER] - Configuration Pusher manquante. Le serveur Pusher est en mode factice (mock).");
    // Création d'un client factice pour éviter les crashs
    pusherServer = {
        trigger: (channel: any, event: any, data: any, options?: any) => {
            console.log(`[PUSHER MOCK] - Trigger sur le canal "${channel}", event: "${event}"`, data);
            return Promise.resolve({} as any);
        },
        authorizeChannel: (socketId: any, channel: any, userData: any) => {
            console.log(`[PUSHER MOCK] - Authorize pour le canal "${channel}"`);
            if (channel.startsWith('presence-')) {
              // Pour les canaux de présence, la réponse doit contenir les données utilisateur
              return Promise.resolve({ auth: 'mock-auth-key', channel_data: JSON.stringify(userData) });
            }
            return Promise.resolve({ auth: 'mock-auth-key' });
        }
    } as any;
}


export async function pusherTrigger(channel: string, event: string, data: any, options?: { socket_id?: string }) {
    try {
        await pusherServer.trigger(channel, event, data, options);
    } catch (error) {
        console.error(`🔴 [PUSHER SERVER ERROR] Failed to trigger event on channel ${channel}:`, error);
        // Ne pas relancer l'erreur pour ne pas casser la requête.
    }
}

// La signature de userData doit correspondre à ce qu'attend Pusher pour les canaux de présence :
// un objet avec `user_id` et `user_info`.
export async function authenticateUser(socketId: string, channel: string, userData: { user_id: string, user_info: object }) {
    return pusherServer.authorizeChannel(socketId, channel, userData);
}
