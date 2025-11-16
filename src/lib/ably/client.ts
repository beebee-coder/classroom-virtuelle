// src/lib/ably/client.ts - VERSION CORRIGÉE AVEC TYPAGE CORRECT
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
    
    // CORRECTION : Options du client Ably optimisées pour 11 utilisateurs
    const clientOptions: Types.ClientOptions = {
        // Au lieu de fournir une clé ou un jeton, nous donnons une URL
        // pour que le client Ably puisse demander un jeton lui-même.
        authUrl: authUrl,
        authMethod: 'POST',
        
        // CORRECTION : Paramètres de reconnexion optimisés
        disconnectedRetryTimeout: 5000,  // Réduction du délai de reconnexion
        suspendedRetryTimeout: 15000,    // Timeout suspendu augmenté
        
        // CORRECTION : Paramètres de performance pour multiples connexions
        echoMessages: false,
        autoConnect: true,
        queueMessages: true,             // Activer la file d'attente des messages
        closeOnUnload: false,            // Éviter la fermeture lors du rechargement
        
        // CORRECTION : Configuration du transport optimisée
        transports: ['web_socket'],      // Forcer WebSocket pour de meilleures performances
        transportParams: {
            // CORRECTION : Timeout de requête augmenté via transportParams
            requestTimeout: 30000
        },
        
        // CORRECTION : Paramètres HTTP pour l'authentification
        httpRequestTimeout: 30000,       // Timeout HTTP augmenté à 30 secondes
        httpMaxRetryCount: 3             // Nombre de tentatives augmenté
    };

    console.log('✅ [ABLY CLIENT] Creating new global Ably Realtime client instance with authUrl and optimized timeouts.');

    const ablyClient = new Ably.Realtime(clientOptions);

    // CORRECTION : Gestion améliorée des états de connexion
    ablyClient.connection.on((stateChange: Types.ConnectionStateChange) => {
        console.log(`🔌 [ABLY CLIENT] Connection state: ${stateChange.previous} -> ${stateChange.current}`);
        
        if (stateChange.current === 'connected') {
            console.log(`🎯 [ABLY CLIENT] Client connected with real clientId: ${ablyClient.auth.clientId}`);
        }
        
        if (stateChange.current === 'failed') {
            console.error(`❌ [ABLY CLIENT] Connection failed:`, stateChange.reason);
        }
        
        if (stateChange.current === 'disconnected') {
            console.warn(`⚠️ [ABLY CLIENT] Connection disconnected, will retry:`, stateChange.reason);
        }
        
        if (stateChange.current === 'suspended') {
            console.warn(`⏸️ [ABLY CLIENT] Connection suspended:`, stateChange.reason);
        }
        
        if (stateChange.reason) {
            console.error(`❌ [ABLY CLIENT] Connection error:`, stateChange.reason);
        }
    });

    // CORRECTION : Gestion correcte des événements avec typage approprié
    ablyClient.connection.on('failed', (stateChange: Types.ConnectionStateChange) => {
        console.error('❌ [ABLY CLIENT] Connection failed permanently:', stateChange.reason);
    });

    // CORRECTION : Surveillance de l'état d'authentification
    ablyClient.connection.on('update', (stateChange: Types.ConnectionStateChange) => {
        if (stateChange.reason?.code === 40142) {
            console.warn('⚠️ [ABLY CLIENT] Authentication token expired, will renew automatically');
        }
    });

    // CORRECTION : Gestion des erreurs d'authentification
    ablyClient.connection.on('failed', (stateChange: Types.ConnectionStateChange) => {
        if (stateChange.reason?.code === 40100) {
            console.error('❌ [ABLY CLIENT] Authentication failed - check auth endpoint:', stateChange.reason);
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

// CORRECTION : Fonction utilitaire pour vérifier l'état de santé de la connexion
export const getAblyConnectionState = (): string | null => {
    return globalClient?.connection.state || null;
};

// CORRECTION : Fonction pour forcer le renouvellement du token si nécessaire
export const renewAblyAuth = async (): Promise<void> => {
    if (globalClient) {
        try {
            console.log('🔄 [ABLY CLIENT] Manually renewing authentication token...');
            await globalClient.auth.authorize();
            console.log('✅ [ABLY CLIENT] Authentication token renewed successfully');
        } catch (error) {
            console.error('❌ [ABLY CLIENT] Error renewing authentication token:', error);
        }
    }
};