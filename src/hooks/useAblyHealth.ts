// src/hooks/useAblyHealth.ts - VERSION CORRIGÉE
'use client';

import { useState, useEffect } from 'react';
import Ably from 'ably';
import { useAbly } from './useAbly';
import { getFriendlyErrorMessage } from '@/lib/ably/error-handling';

export type AblyConnectionStatus = 'initialized' | 'connecting' | 'connected' | 'disconnected' | 'suspended' | 'closing' | 'closed' | 'failed';

interface AblyHealthState {
    status: AblyConnectionStatus;
    error: string | null;
    isLoading: boolean;
    isConnected: boolean;
}

/**
 * A hook to monitor the health and status of the Ably connection.
 * Uses the shared Ably client instance for consistency.
 * @returns The current connection status and a user-friendly error message if any.
 */
export function useAblyHealth(): AblyHealthState {
    const { client, connectionState, connectionError, isConnected } = useAbly('useAblyHealth');
    
    const [error, setError] = useState<string | null>(null);
    
    // CORRECTION: Utiliser directement les valeurs de useAbly sans duplication d'état
    const status = (connectionState || 'initialized') as AblyConnectionStatus;
    const isLoading = connectionState === 'initialized' || connectionState === 'connecting';

    useEffect(() => {
        if (!client) {
            console.log(`[useAblyHealth] - No client available, using connectionState: ${connectionState}`);
            return;
        }

        console.log(`[useAblyHealth] - Setting up health monitoring for shared Ably client, current state: ${connectionState}`);

        const handleStateChange = (stateChange: Ably.Types.ConnectionStateChange) => {
            console.log(`[useAblyHealth] - Ably connection state change: ${stateChange.previous} -> ${stateChange.current}`);
            
            // CORRECTION: Ne pas dupliquer l'état, laisser useAbly gérer
            if (stateChange.reason) {
                console.error('[useAblyHealth] - Connection error reason:', stateChange.reason);
                const friendlyError = getFriendlyErrorMessage(stateChange.reason);
                setError(friendlyError);
                
                if (stateChange.current === 'failed' || stateChange.current === 'suspended') {
                    console.error(`[useAblyHealth] - Critical connection error: ${friendlyError}`);
                }
            } else {
                // CORRECTION: Effacer l'erreur lors de la reconnexion
                if (stateChange.current === 'connected') {
                    setError(null);
                }
            }
        };

        client.connection.on(handleStateChange);
        
        return () => {
            console.log(`[useAblyHealth] - Cleaning up health monitoring`);
            client.connection.off(handleStateChange);
        };
    }, [client, connectionState]);

    // CORRECTION: Gestion centralisée des erreurs
    useEffect(() => {
        if (connectionError) {
            console.error('[useAblyHealth] - Connection error from useAbly hook:', connectionError);
            const friendlyError = getFriendlyErrorMessage(connectionError);
            setError(friendlyError);
        } else if (status === 'connected') {
            setError(null);
        }
    }, [connectionError, status]);

    return { 
        status, 
        error,
        isLoading,
        isConnected: isConnected || status === 'connected'
    };
}
