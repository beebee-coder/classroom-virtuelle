// src/lib/ably/client.ts - VERSION CORRIGÉE
'use client';
import Ably, { type Types } from 'ably';
import { Realtime } from 'ably';

// Singleton pour partager l'instance client entre les composants
let globalClient: Ably.Realtime | null = null;
let currentClientId: string | null = null;

/**
 * Fonction utilitaire pour obtenir un clientId temporaire sécurisé
 * NE PAS essayer de récupérer l'userId de session ici
 */
const getTemporaryClientId = (): string => {
    return `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

/**
 * Crée un client Ably basique sans authentification de session
 * À utiliser par useAbly() pour les composants sans session
 */
export const getAblyClient = (): Ably.Realtime => {
    const ablyApiKey = process.env.NEXT_PUBLIC_ABLY_API_KEY;

    if (!ablyApiKey) {
        const errorMsg = '❌ [ABLY CLIENT] NEXT_PUBLIC_ABLY_API_KEY is not set.';
        console.error(errorMsg);
        throw new Error(errorMsg);
    }

    // TOUJOURS utiliser un clientId temporaire - la session sera gérée par useAblyWithSession
    const clientId = getTemporaryClientId();

    // Réutiliser l'instance existante si disponible
    if (globalClient && currentClientId === clientId) {
        console.log('🔄 [ABLY CLIENT] Reusing existing standard Ably client instance.');
        return globalClient;
    }

    // Fermer l'ancienne instance si elle existe
    if (globalClient) {
        console.log('🔄 [ABLY CLIENT] Closing previous standard Ably client instance.');
        globalClient.close();
        globalClient = null;
        currentClientId = null;
    }

    // CORRECTION: Configuration moderne des logs
    const clientOptions: Types.ClientOptions = {
        // Authentification directe par clé API
        key: ablyApiKey,
        clientId: clientId,
        
        // Paramètres de connexion optimisés
        echoMessages: false,
        autoConnect: true,
        disconnectedRetryTimeout: 5000, // Réduit pour récupération plus rapide
        suspendedRetryTimeout: 15000,  // Réduit pour récupération plus rapide
        
        // CORRECTION: Configuration moderne des logs (sans l'option dépréciée)
        logLevel: process.env.NODE_ENV === 'development' ? 2 : 1 as any,
    };

    console.log('✅ [ABLY CLIENT] Creating new standard Ably Realtime client instance (temporary clientId).');
    console.log(`🔑 [ABLY CLIENT] Client ID: ${clientId}`);

    const ablyClient = new Realtime(clientOptions);

    // Gestion des événements de connexion
    ablyClient.connection.on((stateChange: Types.ConnectionStateChange) => {
        console.log(`🔌 [ABLY CLIENT] Connection state: ${stateChange.previous} -> ${stateChange.current}`);
        
        if (stateChange.current === 'connected') {
            console.log(`🎯 [ABLY CLIENT] Standard client connected with clientId: ${ablyClient.auth.clientId}`);
        }
        
        if (stateChange.reason) {
            console.error(`❌ [ABLY CLIENT] Connection error:`, stateChange.reason);
            
            // CORRECTION: Gestion spécifique des erreurs de timeout
            if (stateChange.reason.code === 80019 || stateChange.reason.statusCode === 408) {
                console.log('🔄 [ABLY CLIENT] Authentication timeout detected in standard client');
            }
        }
    });

    ablyClient.connection.on('failed', (stateChange: Types.ConnectionStateChange) => {
        console.error('💥 [ABLY CLIENT] Standard client connection failed:', stateChange.reason);
    });

    // CORRECTION: Gestion des erreurs d'authentification
    ablyClient.connection.on('disconnected', (stateChange: Types.ConnectionStateChange) => {
        if (stateChange.reason?.code === 80019) {
            console.log('🔄 [ABLY CLIENT] Authentication error, will attempt reconnection...');
        }
    });

    // Stocker l'instance globale
    globalClient = ablyClient;
    currentClientId = clientId;

    return ablyClient;
};

/**
 * Fonction pour fermer proprement le client global
 * À utiliser lors du démontage de l'application
 */
export const closeAblyClient = (): void => {
    if (globalClient) {
        console.log('🚪 [ABLY CLIENT] Closing global Ably client instance.');
        globalClient.close();
        globalClient = null;
        currentClientId = null;
    }
};

/**
 * Vérifie si le client actuel utilise un clientId temporaire
 */
export const isUsingTemporaryClientId = (): boolean => {
    return currentClientId ? currentClientId.startsWith('temp_') : true;
};

/**
 * CORRECTION NOUVELLE: Récupère l'état actuel du client global
 */
export const getGlobalClientState = (): Types.ConnectionState | null => {
    return globalClient?.connection.state || null;
};

/**
 * CORRECTION NOUVELLE: Force la reconnexion du client global
 */
export const reconnectGlobalClient = (): void => {
    if (globalClient && (
        globalClient.connection.state === 'disconnected' || 
        globalClient.connection.state === 'failed' ||
        globalClient.connection.state === 'suspended'
    )) {
        console.log('🔄 [ABLY CLIENT] Manually reconnecting global client...');
        globalClient.connect();
    }
};