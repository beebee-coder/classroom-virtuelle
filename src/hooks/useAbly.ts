// src/hooks/useAbly.ts - VERSION CORRIGÉE
'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import Ably, { type Types } from 'ably';
import { getAblyClient } from '@/lib/ably/client';

interface UseAblyReturn {
    client: Ably.Realtime;
    connectionError: Types.ErrorInfo | null;
    isConnected: boolean;
    connectionState: Types.ConnectionState;
}

// Singleton avec compteur de références pour une gestion propre
let globalClient: Ably.Realtime | null = null;
let clientRefCount = 0;

/**
 * A React hook to get a memoized Ably client instance.
 * Uses a singleton pattern with reference counting to prevent multiple connections.
 */
export function useAbly(): UseAblyReturn {
    const [connectionError, setConnectionError] = useState<Types.ErrorInfo | null>(null);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [connectionState, setConnectionState] = useState<Types.ConnectionState>('initialized');
    const isInitializedRef = useRef(false);
    const componentIdRef = useRef(`component_${Math.random().toString(36).substr(2, 9)}`);

    // Utilisation de useMemo pour créer l'instance une seule fois
    const client = useMemo(() => {
        if (!globalClient) {
            console.log('🪝 [useAbly] - Creating new Ably client instance.');
            globalClient = getAblyClient();
            clientRefCount = 0;
        }
        
        clientRefCount++;
        console.log(`🪝 [useAbly] - Reusing existing Ably client instance. Ref count: ${clientRefCount} (${componentIdRef.current})`);
        
        return globalClient;
    }, []);

    useEffect(() => {
        // Éviter les doubles initialisations en Strict Mode
        if (isInitializedRef.current) {
            console.log(`🔄 [useAbly] - Skipping re-initialization in Strict Mode (${componentIdRef.current})`);
            return;
        }
        isInitializedRef.current = true;

        console.log(`🎯 [useAbly] - Initializing connection listener (${componentIdRef.current})`);

        const handleConnectionChange = (stateChange: Types.ConnectionStateChange) => {
            console.log(`🔌 [useAbly] - Connection state: ${stateChange.previous} → ${stateChange.current} (${componentIdRef.current})`);
            
            setConnectionState(stateChange.current);
            setIsConnected(stateChange.current === 'connected');

            if (stateChange.reason) {
                console.error('❌ [useAbly] - Connection error:', stateChange.reason);
                setConnectionError(stateChange.reason);
            } else {
                setConnectionError(null);
            }
        };

        // Écouter tous les changements d'état
        client.connection.on(handleConnectionChange);

        // Vérifier l'état actuel au montage
        const currentState = client.connection.state;
        console.log(`📊 [useAbly] - Current connection state: ${currentState} (${componentIdRef.current})`);
        setConnectionState(currentState);
        setIsConnected(currentState === 'connected');

        // Cleanup on unmount
        return () => {
            console.log(`🧹 [useAbly] - Cleaning up connection listener (${componentIdRef.current})`);
            client.connection.off(handleConnectionChange);
            
            // Décrémenter le compteur et fermer si plus de références
            clientRefCount--;
            console.log(`📉 [useAbly] - Ref count decreased to: ${clientRefCount} (${componentIdRef.current})`);
            
            if (clientRefCount <= 0 && globalClient) {
                console.log('🚪 [useAbly] - No more references, closing Ably connection');
                globalClient.close();
                globalClient = null;
                clientRefCount = 0;
            }
        };
    }, [client]);

    return { 
        client, 
        connectionError, 
        isConnected,
        connectionState 
    };
}