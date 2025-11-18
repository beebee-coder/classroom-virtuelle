// src/lib/ably/client.ts - VERSION CORRIGÉE POUR VERCEL (SANS ERREURS TYPESCRIPT)
'use client';
import Ably, { type Types } from 'ably';

// Singleton pour partager l'instance client entre les composants
let globalClient: Ably.Realtime | null = null;
let refCount = 0;

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

    // ✅ CORRECTION CRITIQUE : URL absolue pour Vercel
    const getAuthUrl = (): string => {
        // En production sur Vercel, utiliser l'URL absolue
        if (typeof window !== 'undefined') {
            const baseUrl = window.location.origin;
            return `${baseUrl}/api/ably/auth`;
        }
        // Fallback pour le SSR
        return '/api/ably/auth';
    };

    const authUrl = getAuthUrl();
    
    // ✅ CORRECTION : Configuration optimisée et VALIDE pour Vercel
    const clientOptions: Types.ClientOptions = {
        authUrl: authUrl,
        authMethod: 'POST',
        
        // ✅ CORRECTION : Timeouts adaptés au serverless
        disconnectedRetryTimeout: 10000,  // Augmenté pour cold starts
        suspendedRetryTimeout: 30000,     // Augmenté pour Vercel
        
        // ✅ CORRECTION : Paramètres de stabilité
        echoMessages: false,
        autoConnect: true,
        queueMessages: true,
        closeOnUnload: true,              // ✅ CORRIGÉ : true pour Vercel
        
        // ✅ CORRECTION : Configuration transport robuste
        transports: ['web_socket'],
        transportParams: {
            requestTimeout: 45000         // Augmenté pour les cold starts
        },
        
        // ✅ CORRECTION : Timeouts HTTP étendus
        httpRequestTimeout: 45000,
        httpMaxRetryCount: 5,             // Plus de tentatives
        
        // ✅ CORRECTION SUPPRIMÉE : Toutes les propriétés invalides retirées
        // ❌ SUPPRIMÉ : 'realtimeRequestTimeout' - n'existe pas
        // ❌ SUPPRIMÉ : 'channelRetryTimeout' - n'existe pas dans ClientOptions ni transportParams
        
        // ✅ CORRECTION : Configuration de logging MODERNISÉE
        logLevel: process.env.NODE_ENV === 'development' ? 2 : 1,
        
        // ✅ CORRECTION : Paramètres spécifiques pour éviter l'erreur 80003
        maxMessageSize: 65536,            // Taille max des messages
        
        // ✅ CORRECTION : Fallback hosts pour la résilience réseau
        fallbackHosts: ['a.ably-realtime.com', 'b.ably-realtime.com', 'c.ably-realtime.com']
    };

    console.log('✅ [ABLY CLIENT] Creating new global Ably Realtime client instance optimized for Vercel.');
    console.log(`🔐 [ABLY CLIENT] Using auth URL: ${authUrl}`);

    const ablyClient = new Ably.Realtime(clientOptions);

    // ✅ CORRECTION AMÉLIORÉE : Gestion d'état robuste pour Vercel
    ablyClient.connection.on((stateChange: Types.ConnectionStateChange) => {
        const previous = stateChange.previous;
        const current = stateChange.current;
        
        console.log(`🔌 [ABLY CLIENT] Connection state: ${previous} -> ${current}`);
        
        switch (current) {
            case 'connected':
                console.log(`🎯 [ABLY CLIENT] Client connected with real clientId: ${ablyClient.auth.clientId}`);
                break;
                
            case 'failed':
                console.error(`❌ [ABLY CLIENT] Connection failed:`, stateChange.reason);
                // ✅ CORRECTION : Nettoyage en cas d'échec permanent
                if (stateChange.reason?.code === 40142) {
                    console.warn('🔄 [ABLY CLIENT] Token expired, will attempt renewal on next connection');
                }
                break;
                
            case 'disconnected':
                console.warn(`⚠️ [ABLY CLIENT] Connection disconnected, will retry in 10s`);
                // ✅ NOUVELLE CORRECTION : Gestion spécifique de l'erreur 80003
                if (stateChange.reason?.code === 80003) {
                    console.warn('🌐 [ABLY CLIENT] WebSocket timeout (80003) - common in Vercel environment');
                    console.log('🔄 [ABLY CLIENT] Implementing aggressive reconnection strategy for Vercel');
                    
                    // ✅ STRATÉGIE SPÉCIFIQUE : Reconnexion immédiate pour Vercel
                    setTimeout(() => {
                        if (ablyClient.connection.state === 'disconnected') {
                            console.log('🚀 [ABLY CLIENT] Attempting immediate reconnection after WebSocket timeout');
                            ablyClient.connect();
                        }
                    }, 2000);
                }
                break;
                
            case 'suspended':
                console.warn(`⏸️ [ABLY CLIENT] Connection suspended - common on Vercel cold starts`);
                break;
                
            case 'closing':
                console.log(`🚪 [ABLY CLIENT] Connection closing gracefully`);
                break;
                
            case 'closed':
                console.log(`🔒 [ABLY CLIENT] Connection closed`);
                break;
        }

        // ✅ CORRECTION : Log des erreurs spécifiques Vercel
        if (stateChange.reason) {
            console.error(`❌ [ABLY CLIENT] Connection error:`, {
                code: stateChange.reason.code,
                statusCode: stateChange.reason.statusCode,
                message: stateChange.reason.message
            });
        }
    });

    // ✅ CORRECTION : Gestion spécifique des erreurs d'authentification Vercel
    ablyClient.connection.on('failed', (stateChange: Types.ConnectionStateChange) => {
        if (stateChange.reason?.code === 40100) {
            console.error('❌ [ABLY CLIENT] Authentication failed - check Vercel environment variables and auth endpoint');
            
            // ✅ CORRECTION : Tentative de récupération pour Vercel
            setTimeout(() => {
                if (globalClient && globalClient.connection.state === 'failed') {
                    console.log('🔄 [ABLY CLIENT] Attempting to recover from auth failure...');
                    globalClient.connect();
                }
            }, 5000);
        }
    });

    // ✅ NOUVELLE CORRECTION : Gestion spécifique des déconnexions WebSocket (erreur 80003)
    ablyClient.connection.on('disconnected', (stateChange: Types.ConnectionStateChange) => {
        if (stateChange.reason?.code === 80003) {
            console.warn('🌐 [ABLY CLIENT] WebSocket closed (80003) - implementing Vercel recovery');
            
            // Stratégie de reconnexion agressive pour Vercel
            setTimeout(() => {
                if (ablyClient.connection.state === 'disconnected' || ablyClient.connection.state === 'suspended') {
                    console.log('🚀 [ABLY CLIENT] Forcing reconnection after WebSocket error');
                    ablyClient.connect();
                }
            }, 3000);
        }
    });

    // ✅ NOUVELLE CORRECTION : Surveiller les erreurs de canal
    ablyClient.connection.on('update', (stateChange: Types.ConnectionStateChange) => {
        if (stateChange.reason?.code === 90001) {
            console.warn('📡 [ABLY CLIENT] Channel operation failed, may need reattachment');
        }
    });

    globalClient = ablyClient;
    refCount = 1;

    return ablyClient;
};

/**
 * Fonction pour fermer proprement le client global.
 * Optimisée pour éviter les fuites mémoire sur Vercel.
 */
export const closeAblyClient = (): void => {
    refCount--;
    
    if (refCount <= 0 && globalClient) {
        const currentState = globalClient.connection.state;
        console.log(`🚪 [ABLY CLIENT] Closing global Ably client instance (refCount: ${refCount}, state: ${currentState})`);
        
        // ✅ CORRECTION : Fermeture plus robuste
        try {
            if (currentState === 'connected' || currentState === 'connecting') {
                globalClient.connection.off(); // Nettoyer les listeners
            }
            globalClient.close();
        } catch (error) {
            console.warn('⚠️ [ABLY CLIENT] Error during close, forcing cleanup:', error);
        } finally {
            globalClient = null;
            refCount = 0;
        }
    } else if (globalClient) {
        console.log(`📊 [ABLY CLIENT] Client still in use (refCount: ${refCount})`);
    }
};

// ✅ CORRECTION : Fonction utilitaire améliorée
export const getAblyConnectionState = (): string | null => {
    return globalClient?.connection.state || null;
};

// ✅ CORRECTION : Fonction de renouvellement avec gestion d'erreur Vercel
export const renewAblyAuth = async (): Promise<void> => {
    if (globalClient) {
        try {
            console.log('🔄 [ABLY CLIENT] Manually renewing authentication token for Vercel...');
            await globalClient.auth.authorize();
            console.log('✅ [ABLY CLIENT] Authentication token renewed successfully');
        } catch (error) {
            console.error('❌ [ABLY CLIENT] Error renewing authentication token on Vercel:', error);
            // ✅ CORRECTION : Reconnecter en cas d'échec
            if (globalClient.connection.state === 'failed') {
                console.log('🔄 [ABLY CLIENT] Attempting reconnect after auth renewal failure');
                globalClient.connect();
            }
        }
    }
};

// ✅ NOUVEAU : Fonction pour vérifier la santé de la connexion Vercel
export const checkAblyHealth = (): { 
    isHealthy: boolean; 
    state: string; 
    clientId?: string 
} => {
    if (!globalClient) {
        return { isHealthy: false, state: 'no_client' };
    }
    
    const state = globalClient.connection.state;
    const isHealthy = state === 'connected' || state === 'connecting';
    
    return {
        isHealthy,
        state,
        clientId: globalClient.auth.clientId || undefined
    };
};

// ✅ NOUVEAU : Fonction pour gérer les rechargements Vercel
export const handleVercelHotReload = (): void => {
    if (globalClient && globalClient.connection.state === 'connected') {
        console.log('♻️ [ABLY CLIENT] Vercel hot reload detected, maintaining connection');
        // Maintenir la connexion existante pendant les rechargements chauds
    }
};

// ✅ NOUVELLE FONCTION : Récupération spécifique pour erreur 80003
export const recoverFromWebSocketTimeout = (): void => {
    if (globalClient) {
        const state = globalClient.connection.state;
        if (state === 'disconnected' || state === 'suspended') {
            console.log('🚀 [ABLY CLIENT] Manual recovery from WebSocket timeout initiated');
            globalClient.connect();
        }
    }
};