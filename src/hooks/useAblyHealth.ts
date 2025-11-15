// src/hooks/useAblyHealth.ts - VERSION CORRIGÉE AVEC useAbly()
'use client';

import { useState, useEffect } from 'react';
import Ably from 'ably';
import { useAbly } from './useAbly'; // CORRECTION: utiliser useAbly au lieu de useAblyWithSession
import { getFriendlyErrorMessage } from '@/lib/ably/error-handling';

export type AblyConnectionStatus = 'initialized' | 'connecting' | 'connected' | 'disconnected' | 'suspended' | 'closing' | 'closed' | 'failed';

interface AblyHealthState {
    status: AblyConnectionStatus;
    error: string | null;
    isLoading: boolean;
}

/**
 * A hook to monitor the health and status of the Ably connection.
 * Uses the shared Ably client instance for consistency.
 * @returns The current connection status and a user-friendly error message if any.
 */
export function useAblyHealth(): AblyHealthState {
    const { client, connectionState, connectionError } = useAbly(); // CORRECTION: utiliser useAbly()
    const [status, setStatus] = useState<AblyConnectionStatus>('initialized');
    const [error, setError] = useState<string | null>(null);
    const isLoading = connectionState === 'initialized' || connectionState === 'connecting';

    useEffect(() => {
        if (!client) {
            console.log(`[useAblyHealth] - No client available`);
            setStatus('initialized');
            setError(null);
            return;
        }

        console.log(`[useAblyHealth] - Setting up health monitoring for shared Ably client`);

        const handleStateChange = (stateChange: Ably.Types.ConnectionStateChange) => {
            console.log(`[useAblyHealth] - Ably connection state: ${stateChange.current}`);
            setStatus(stateChange.current as AblyConnectionStatus);

            if (stateChange.reason) {
                console.error('[useAblyHealth] - Connection error reason:', stateChange.reason);
                setError(getFriendlyErrorMessage(stateChange.reason));
            } else {
                setError(null);
            }
        };

        client.connection.on(handleStateChange);
        
        // Set initial state
        setStatus(client.connection.state as AblyConnectionStatus);
        
        return () => {
            console.log(`[useAblyHealth] - Cleaning up health monitoring`);
            client.connection.off(handleStateChange);
        };
    }, [client]);

    // CORRECTION: Gérer les erreurs de connexion depuis le hook useAbly
    useEffect(() => {
        if (connectionError) {
            setError(getFriendlyErrorMessage(connectionError));
        }
    }, [connectionError]);

    return { 
        status: isLoading ? 'initialized' : status, 
        error,
        isLoading 
    };
}