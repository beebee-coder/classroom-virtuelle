// src/hooks/useAblyHealth.ts - VERSION CORRIGÉE
'use client';

import { useState, useEffect } from 'react';
import Ably from 'ably';
import { useAblyWithSession } from './useAblyWithSession'; // CHANGEMENT ICI
import { getFriendlyErrorMessage } from '@/lib/ably/error-handling';

export type AblyConnectionStatus = 'initialized' | 'connecting' | 'connected' | 'disconnected' | 'suspended' | 'closing' | 'closed' | 'failed';

interface AblyHealthState {
    status: AblyConnectionStatus;
    error: string | null;
    isLoading: boolean;
}

/**
 * A hook to monitor the health and status of the Ably connection.
 * Uses the authenticated session client for consistency.
 * @returns The current connection status and a user-friendly error message if any.
 */
export function useAblyHealth(): AblyHealthState {
    const { client, isLoading } = useAblyWithSession(); // CHANGEMENT ICI
    const [status, setStatus] = useState<AblyConnectionStatus>('initialized');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!client || isLoading) {
            console.log(`[useAblyHealth] - No client available or still loading`);
            setStatus('initialized');
            setError(null);
            return;
        }

        console.log(`[useAblyHealth] - Setting up health monitoring for authenticated client`);

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
    }, [client, isLoading]);

    return { 
        status: isLoading ? 'initialized' : status, 
        error,
        isLoading 
    };
}