// src/lib/ably/client.ts - VERSION CORRIGÉE POUR STABILITÉ
'use client';
import Ably, { type Types } from 'ably';

// Singleton pour partager l'instance client entre les composants
let globalClient: Ably.Realtime | null = null;
let refCount = 0;
let connectionHandlerAttached = false;

/**
 * Fonction pour obtenir l'instance unique du client Ably.
 * Optimisée pour l'environnement serverless de Vercel.
 */
export const getAblyClient = (): Ably.Realtime => {
    if (globalClient) {
        console.log('🔄 [ABLY CLIENT] Reusing existing global Ably client instance.');
        refCount++;
        return globalClient;
    }

    // ✅ CORRECTION : URL absolue pour Vercel
    const getAuthUrl = (): string => {
        if (typeof window !== 'undefined') {
            const baseUrl = window.location.origin;
            return `${baseUrl}/api/ably/auth`;
        }
        return '/api/ably/auth';
    };

    const authUrl = getAuthUrl();
    
    // ✅ CORRECTION : Configuration simplifiée et robuste
    const clientOptions: Types.ClientOptions = {
        authUrl: authUrl,
        authMethod: 'POST',
        
        // ✅ CORRECTION : Timeouts optimisés
        disconnectedRetryTimeout: 10000,
        suspendedRetryTimeout: 30000,
        
        // ✅ CORRECTION : Paramètres de stabilité
        echoMessages: false,
        autoConnect: true,
        queueMessages: true,
        closeOnUnload: false, // ✅ CORRIGÉ : false pour éviter les déconnexions intempestives
        
        // ✅ CORRECTION : Configuration transport
        transports: ['web_socket'],
        transportParams: {
            requestTimeout: 30000
        },
        
        // ✅ CORRECTION : Timeouts HTTP
        httpRequestTimeout: 30000,
        httpMaxRetryCount: 3,
        
        // ✅ CORRECTION : Configuration de logging
        logLevel: process.env.NODE_ENV === 'development' ? 2 : 1,
        
        // ✅ CORRECTION : Paramètres de message
        maxMessageSize: 65536,
        
        // ✅ CORRECTION : Fallback hosts
        fallbackHosts: ['a.ably-realtime.com', 'b.ably-realtime.com', 'c.ably-realtime.com']
    };

    console.log('✅ [ABLY CLIENT] Creating new global Ably Realtime client instance optimized for Vercel.');
    console.log(`🔐 [ABLY CLIENT] Using auth URL: ${authUrl}`);

    const ablyClient = new Ably.Realtime(clientOptions);

    // ✅ CORRECTION : Handler UNIQUE pour éviter les doublons
    if (!connectionHandlerAttached) {
        const connectionHandler = (stateChange: Types.ConnectionStateChange) => {
            const previous = stateChange.previous;
            const current = stateChange.current;
            
            console.log(`🔌 [ABLY CLIENT] Connection state: ${previous} -> ${current}`);
            
            switch (current) {
                case 'connected':
                    console.log(`🎯 [ABLY CLIENT] Client connected with real clientId: ${ablyClient.auth.clientId}`);
                    break;
                    
                case 'failed':
                    console.error(`❌ [ABLY CLIENT] Connection failed:`, stateChange.reason);
                    // ✅ CORRECTION : Stratégie de récupération modérée
                    if (stateChange.reason?.code === 40142) {
                        console.warn('🔄 [ABLY CLIENT] Token expired, will attempt renewal');
                    }
                    break;
                    
                case 'disconnected':
                    console.warn(`⚠️ [ABLY CLIENT] Connection disconnected`);
                    // ✅ CORRECTION : Stratégie de reconnexion plus conservative
                    if (stateChange.reason?.code === 80003) {
                        console.warn('🌐 [ABLY CLIENT] WebSocket timeout (80003) - Vercel environment');
                        // La reconnexion automatique d'Ably suffit généralement
                    }
                    break;
                    
                case 'suspended':
                    console.warn(`⏸️ [ABLY CLIENT] Connection suspended`);
                    break;
                    
                case 'closing':
                    console.log(`🚪 [ABLY CLIENT] Connection closing`);
                    break;
                    
                case 'closed':
                    console.log(`🔒 [ABLY CLIENT] Connection closed`);
                    break;
            }

            // ✅ CORRECTION : Log des erreurs importantes seulement
            if (stateChange.reason && (stateChange.reason.code >= 40000 || current === 'failed')) {
                console.error(`❌ [ABLY CLIENT] Connection error:`, {
                    code: stateChange.reason.code,
                    statusCode: stateChange.reason.statusCode,
                    message: stateChange.reason.message
                });
            }
        };

        ablyClient.connection.on(connectionHandler);
        connectionHandlerAttached = true;

        // ✅ CORRECTION : Gestion UNIFIÉE des erreurs critiques
        ablyClient.connection.on('failed', (stateChange: Types.ConnectionStateChange) => {
            if (stateChange.reason?.code === 40100) {
                console.error('❌ [ABLY CLIENT] Authentication failed - check auth endpoint');
                // Ne pas tenter de reconnexion automatique pour les erreurs d'auth
            }
        });
    }

    globalClient = ablyClient;
    refCount = 1;

    return ablyClient;
};

/**
 * Fonction pour fermer proprement le client global.
 * CORRECTION MAJEURE : Logique de compteur de références fixée.
 */
export const closeAblyClient = (): void => {
    if (refCount > 0) {
        refCount--;
    }
    
    console.log(`📊 [ABLY CLIENT] Close requested (refCount: ${refCount})`);
    
    if (refCount <= 0 && globalClient) {
        const currentState = globalClient.connection.state;
        console.log(`🚪 [ABLY CLIENT] Closing global Ably client instance (state: ${currentState})`);
        
        try {
            // ✅ CORRECTION : Ne pas nettoyer les listeners globaux ici
            // Ils sont gérés par le singleton et réutilisés
            if (currentState === 'connected' || currentState === 'connecting') {
                globalClient.close();
            }
        } catch (error) {
            console.warn('⚠️ [ABLY CLIENT] Error during close:', error);
        } finally {
            // ✅ CORRECTION : Reset uniquement quand vraiment nécessaire
            globalClient = null;
            refCount = 0;
            connectionHandlerAttached = false;
        }
    } else if (globalClient) {
        console.log(`📊 [ABLY CLIENT] Client still in use by ${refCount} components`);
    }
};

// ✅ CORRECTION : Fonction utilitaire améliorée
export const getAblyConnectionState = (): string | null => {
    return globalClient?.connection.state || null;
};

// ✅ CORRECTION : Fonction de renouvellement sécurisée
export const renewAblyAuth = async (): Promise<boolean> => {
    if (!globalClient) {
        console.warn('❌ [ABLY CLIENT] No client available for auth renewal');
        return false;
    }

    try {
        console.log('🔄 [ABLY CLIENT] Manually renewing authentication token...');
        await globalClient.auth.authorize();
        console.log('✅ [ABLY CLIENT] Authentication token renewed successfully');
        return true;
    } catch (error) {
        console.error('❌ [ABLY CLIENT] Error renewing authentication token:', error);
        return false;
    }
};

// ✅ CORRECTION : Fonction de santé améliorée
export const checkAblyHealth = (): { 
    isHealthy: boolean; 
    state: string; 
    clientId?: string;
    refCount: number;
} => {
    if (!globalClient) {
        return { isHealthy: false, state: 'no_client', refCount };
    }
    
    const state = globalClient.connection.state;
    const isHealthy = state === 'connected';

    return {
        isHealthy,
        state,
        clientId: globalClient.auth.clientId || undefined,
        refCount
    };
};

// ✅ NOUVELLE FONCTION : Reset complet pour les rechargements chauds
export const resetAblyClient = (): void => {
    if (globalClient) {
        console.log('♻️ [ABLY CLIENT] Resetting Ably client for hot reload');
        try {
            globalClient.close();
        } catch (error) {
            // Ignorer les erreurs lors du reset
        }
    }
    globalClient = null;
    refCount = 0;
    connectionHandlerAttached = false;
};

// ✅ NOUVELLE FONCTION : Vérification de sécurité avant utilisation
export const isAblyClientReady = (): boolean => {
    return !!globalClient && 
           (globalClient.connection.state === 'connected' || 
            globalClient.connection.state === 'connecting');
};
