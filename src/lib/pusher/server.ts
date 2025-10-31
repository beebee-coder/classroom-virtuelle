// src/lib/pusher/server.ts
import Pusher from 'pusher';

const isPusherConfigured = 
    process.env.PUSHER_APP_ID &&
    process.env.NEXT_PUBLIC_PUSHER_KEY &&
    process.env.PUSHER_SECRET &&
    process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

export let pusherServer: Pusher;

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
    // ⚠️ CORRECTION : Création d'un mock plus robuste
    pusherServer = {
        trigger: (channel: any, event: any, data: any, options?: any) => {
            console.log(`[PUSHER MOCK] - Trigger sur le canal "${channel}", event: "${event}"`, data);
            return Promise.resolve({} as any);
        },
        authorizeChannel: (socketId: any, channel: any, userData: any) => {
            console.log(`[PUSHER MOCK] - Authorize pour le canal "${channel}"`);
            if (channel.startsWith('presence-')) {
              // ⚠️ CORRECTION : Format correct pour les canaux de présence
              const authResponse = {
                auth: 'mock-auth-key-' + Math.random().toString(36).substr(2, 9),
                channel_data: JSON.stringify({
                  user_id: userData.user_id,
                  user_info: userData.user_info
                })
              };
              console.log('🔧 [PUSHER MOCK] - Réponse d\'auth:', authResponse);
              return Promise.resolve(authResponse);
            }
            // Pour les canaux privés
            return Promise.resolve({ 
                auth: 'mock-auth-key-' + Math.random().toString(36).substr(2, 9) 
            });
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

// ⚠️ CORRECTION : Meilleure gestion d'erreur
export async function authenticateUser(socketId: string, channel: string, userData: { user_id: string, user_info: object }) {
    try {
        console.log(`🔐 [PUSHER AUTH] - Authentification pour socket ${socketId}, canal ${channel}`);
        const authResponse = await pusherServer.authorizeChannel(socketId, channel, userData);
        console.log('✅ [PUSHER AUTH] - Authentification réussie:', authResponse);
        return authResponse;
    } catch (error) {
        console.error('❌ [PUSHER AUTH] - Erreur d\'authentification:', error);
        throw error;
    }
}