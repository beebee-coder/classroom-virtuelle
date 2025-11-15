// src/hooks/useAblyWithSession.ts - VERSION CORRIGÉE
'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Realtime, type Types } from 'ably';
import { getAblyClient } from '@/lib/ably/client';

interface UseAblyWithSessionReturn {
    client: Realtime | null;
    connectionError: Types.ErrorInfo | null;
    isConnected: boolean;
    connectionState: Types.ConnectionState;
    isLoading: boolean;
}

// Interface pour gérer les instances par utilisateur
interface AuthenticatedClient {
    client: Realtime;
    refCount: number;
    connectionState: Types.ConnectionState;
}

// Variables globales pour la gestion des instances
declare global {
    var globalAblyClient: Realtime | null;
    var authenticatedClients: Map<string, AuthenticatedClient>;
}

// Initialiser les variables globales
if (typeof globalThis.globalAblyClient === 'undefined') {
    globalThis.globalAblyClient = null;
}
if (typeof globalThis.authenticatedClients === 'undefined') {
    globalThis.authenticatedClients = new Map();
}

/**
 * Hook Ably qui utilise la session NextAuth pour récupérer l'userId
 * Version simplifiée avec gestion stable des connexions
 */
export function useAblyWithSession(): UseAblyWithSessionReturn {
    const { data: session, status } = useSession();
    const [connectionError, setConnectionError] = useState<Types.ErrorInfo | null>(null);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [connectionState, setConnectionState] = useState<Types.ConnectionState>('initialized');
    
    // Références pour la gestion du cycle de vie
    const componentIdRef = useRef(`session_component_${Math.random().toString(36).substring(2, 15)}`);
    const connectionListenerRef = useRef<((stateChange: Types.ConnectionStateChange) => void) | null>(null);
    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const mountedRef = useRef(true);
    const hasRegisteredListenerRef = useRef(false);

    const isLoading = status === 'loading';
    const userId = session?.user?.id;

    // Configuration des logs Ably
    const getClientOptions = useCallback((clientId: string): Types.ClientOptions => {
        return {
            clientId: clientId,
            authUrl: '/api/ably/auth',
            authMethod: 'POST',
            authHeaders: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            },
            authParams: {
                clientId: clientId
            },
            echoMessages: false,
            autoConnect: true,
            disconnectedRetryTimeout: 5000,
            suspendedRetryTimeout: 15000,
            // CORRECTION: Supprimé la propriété en double 'closeOnUnload'
        };
    }, []);

    // Nettoyage des timeouts
    const clearRetryTimeout = useCallback(() => {
        if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = null;
        }
    }, []);

    // CORRECTION: Gestion simplifiée du comptage de références
    const manageClientRefCount = useCallback((increment: boolean) => {
        if (!mountedRef.current) {
            console.log(`⏭️ [useAblyWithSession] - Component unmounted, skipping ref count operation (${componentIdRef.current})`);
            return;
        }

        if (!userId) {
            // Client global - pas de comptage de références, toujours actif
            console.log(`🌐 [useAblyWithSession] - Using global client, no ref counting (${componentIdRef.current})`);
            return;
        }

        const userClient = globalThis.authenticatedClients.get(userId);
        if (userClient) {
            if (increment) {
                userClient.refCount++;
                console.log(`📈 [useAblyWithSession] - Ref count for user ${userId} increased to: ${userClient.refCount} (${componentIdRef.current})`);
            } else {
                userClient.refCount = Math.max(0, userClient.refCount - 1);
                console.log(`📉 [useAblyWithSession] - Ref count for user ${userId} decreased to: ${userClient.refCount} (${componentIdRef.current})`);
                
                // CORRECTION: Ne jamais fermer la connexion automatiquement
                if (userClient.refCount === 0) {
                    console.log(`💤 [useAblyWithSession] - No active components for user ${userId}, keeping connection alive`);
                }
            }
        }
    }, [userId]);

    // CORRECTION: Client memo avec logique simplifiée
    const client = useMemo(() => {
        if (isLoading) {
            console.log(`🪝 [useAblyWithSession] - Waiting for session to load... (${componentIdRef.current})`);
            return null;
        }

        if (!userId) {
            console.log(`🌐 [useAblyWithSession] - Using global Ably client (${componentIdRef.current})`);
            
            if (!globalThis.globalAblyClient) {
                console.log(`🆕 [useAblyWithSession] - Creating new global Ably client (${componentIdRef.current})`);
                globalThis.globalAblyClient = getAblyClient();
            }
            
            return globalThis.globalAblyClient;
        }

        let userClient = globalThis.authenticatedClients.get(userId);
        
        if (userClient) {
            console.log(`🔁 [useAblyWithSession] - Reusing existing Ably client for user: ${userId} (${componentIdRef.current})`);
            return userClient.client;
        }

        console.log(`🆕 [useAblyWithSession] - Creating new authenticated Ably client for user: ${userId} (${componentIdRef.current})`);
        
        const ablyApiKey = process.env.NEXT_PUBLIC_ABLY_API_KEY;
        if (!ablyApiKey) {
            console.error('❌ [ABLY CLIENT] NEXT_PUBLIC_ABLY_API_KEY is not set.');
            return null;
        }

        const clientOptions = getClientOptions(userId);
        
        const ablyClient = new Realtime(clientOptions);

        // CORRECTION: Initialiser avec refCount = 1 pour ce composant
        userClient = {
            client: ablyClient,
            refCount: 1,
            connectionState: 'initialized'
        };
        
        globalThis.authenticatedClients.set(userId, userClient);
        
        console.log(`✅ [useAblyWithSession] - Registered new Ably client for user ${userId}. Total users: ${globalThis.authenticatedClients.size}`);

        return ablyClient;

    }, [userId, isLoading, getClientOptions]);

    // CORRECTION: Hook principal avec gestion stable des connexions
    useEffect(() => {
        mountedRef.current = true;

        if (!client) {
            return;
        }

        // CORRECTION: Éviter les écouteurs en double
        if (hasRegisteredListenerRef.current) {
            console.log(`⏭️ [useAblyWithSession] - Listener already registered, skipping (${componentIdRef.current})`);
            return;
        }

        console.log(`🎯 [useAblyWithSession] - Initializing connection listener for user ${userId} (${componentIdRef.current})`);

        const handleConnectionChange = (stateChange: Types.ConnectionStateChange) => {
            if (!mountedRef.current) return;

            console.log(`🔌 [useAblyWithSession] - Connection state: ${stateChange.previous} → ${stateChange.current} (user: ${userId}, ${componentIdRef.current})`);
            
            setConnectionState(stateChange.current);
            setIsConnected(stateChange.current === 'connected');

            if (userId) {
                const userClient = globalThis.authenticatedClients.get(userId);
                if (userClient) {
                    userClient.connectionState = stateChange.current;
                }
            }

            // CORRECTION: Gestion d'erreurs simplifiée
            if (stateChange.reason) {
                // Ignorer les erreurs de fermeture normale
                if (stateChange.reason.code === 80017 || 
                    stateChange.reason.message?.includes('Connection closing') ||
                    stateChange.reason.message?.includes('Connection closed')) {
                    console.log(`🔌 [useAblyWithSession] - Normal connection closure, ignoring error`);
                    setConnectionError(null);
                } else {
                    console.error('❌ [useAblyWithSession] - Connection error:', stateChange.reason);
                    setConnectionError(stateChange.reason);
                }
            } else {
                setConnectionError(null);
                clearRetryTimeout();
            }
        };

        connectionListenerRef.current = handleConnectionChange;
        client.connection.on(handleConnectionChange);
        hasRegisteredListenerRef.current = true;

        // CORRECTION: État initial cohérent
        const currentState = client.connection.state;
        console.log(`📊 [useAblyWithSession] - Current connection state: ${currentState} (user: ${userId}, ${componentIdRef.current})`);
        
        setConnectionState(currentState);
        setIsConnected(currentState === 'connected');

        // CORRECTION: Incrémenter le compteur une seule fois
        manageClientRefCount(true);

        return () => {
            mountedRef.current = false;
            hasRegisteredListenerRef.current = false;
            
            console.log(`🧹 [useAblyWithSession] - Cleaning up connection listener for user ${userId} (${componentIdRef.current})`);
            
            clearRetryTimeout();
            
            if (client && connectionListenerRef.current) {
                client.connection.off(connectionListenerRef.current);
                connectionListenerRef.current = null;
            }

            // CORRECTION: Décrémenter le compteur
            manageClientRefCount(false);
        };
    }, [client, userId, manageClientRefCount, clearRetryTimeout]);

    // CORRECTION: Retourner un état de chargement stable
    const stableIsLoading = useMemo(() => {
        return isLoading || !client;
    }, [isLoading, client]);

    return { 
        client, 
        connectionError, 
        isConnected,
        connectionState,
        isLoading: stableIsLoading
    };
}