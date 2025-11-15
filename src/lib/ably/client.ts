// src/lib/ably/client.ts - VERSION FINALE AVEC AUTHURL
'use client';
import Ably, { type Types } from 'ably';

// Singleton pour partager l'instance client entre les composants
let globalClient: Ably.Realtime | null = null;
let refCount = 0;

/**
 * Fonction pour obtenir l'instance unique du client Ably.
 * Utilise une URL d'authentification pour obtenir des jetons, ce qui permet à Ably
 * de gérer automatiquement l'authentification et le renouvellement des jetons.
 */
export const getAblyClient = (): Ably.Realtime => {
    if (globalClient) {
        console.log('🔄 [ABLY CLIENT] Reusing existing global Ably client instance.');
        refCount++;
        return globalClient;
    }

    // L'URL de notre route API qui gère l'authentification Ably
    const authUrl = '/api/ably/auth';
    
    // Options du client Ably
    const clientOptions: Types.ClientOptions = {
        // Au lieu de fournir une clé ou un jeton, nous donnons une URL
        // pour que le client Ably puisse demander un jeton lui-même.
        authUrl: authUrl,
        authMethod: 'POST',
        
        // Paramètres de connexion optimisés
        echoMessages: false,
        autoConnect: true, // Le client se connectera automatiquement
        disconnectedRetryTimeout: 10000,
        suspendedRetryTimeout: 20000,
    };

    console.log('✅ [ABLY CLIENT] Creating new global Ably Realtime client instance with authUrl.');

    const ablyClient = new Ably.Realtime(clientOptions);

    ablyClient.connection.on((stateChange: Types.ConnectionStateChange) => {
        console.log(`🔌 [ABLY CLIENT] Connection state: ${stateChange.previous} -> ${stateChange.current}`);
        
        if (stateChange.current === 'connected') {
            console.log(`🎯 [ABLY CLIENT] Client connected with real clientId: ${ablyClient.auth.clientId}`);
        }
        
        if (stateChange.reason) {
            console.error(`❌ [ABLY CLIENT] Connection error:`, stateChange.reason);
        }
    });

    globalClient = ablyClient;
    refCount = 1;

    return ablyClient;
};

/**
 * Fonction pour fermer proprement le client global si nécessaire.
 * Appelle cette fonction lorsque l'application principale est démontée.
 */
export const closeAblyClient = (): void => {
    refCount--;
    if (refCount <= 0 && globalClient) {
        console.log('🚪 [ABLY CLIENT] Closing global Ably client instance.');
        globalClient.close();
        globalClient = null;
        refCount = 0;
    }
};
