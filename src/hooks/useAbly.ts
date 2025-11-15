// src/hooks/useAbly.ts - VERSION FINALE UNIFIÉE
'use client';

import { useEffect, useState, useMemo } from 'react';
import Ably, { type Types } from 'ably';
import { getAblyClient } from '@/lib/ably/client';

interface UseAblyReturn {
    client: Ably.Realtime | null;
    connectionError: Types.ErrorInfo | null;
    isConnected: boolean;
    connectionState: Types.ConnectionState;
}

/**
 * A React hook to get a memoized, authenticated Ably client instance.
 * This is the SINGLE source of truth for the Ably client in the app.
 * It handles the singleton client instance and its connection state.
 */
export function useAbly(): UseAblyReturn {
    const [client, setClient] = useState<Ably.Realtime | null>(null);
    const [connectionError, setConnectionError] = useState<Types.ErrorInfo | null>(null);
    const [connectionState, setConnectionState] = useState<Types.ConnectionState>('initialized');

    useEffect(() => {
        const ablyClient = getAblyClient();
        setClient(ablyClient);

        const handleConnectionChange = (stateChange: Types.ConnectionStateChange) => {
            setConnectionState(stateChange.current);
            if (stateChange.reason) {
                setConnectionError(stateChange.reason);
            } else {
                setConnectionError(null);
            }
        };

        ablyClient.connection.on(handleConnectionChange);

        // Set initial state
        setConnectionState(ablyClient.connection.state);
        if (ablyClient.connection.errorReason) {
            setConnectionError(ablyClient.connection.errorReason);
        }

        // Cleanup on unmount
        return () => {
            ablyClient.connection.off(handleConnectionChange);
            // The global client is managed by getAblyClient, no need to close it here.
        };
    }, []);

    const isConnected = connectionState === 'connected';

    return { 
        client, 
        connectionError, 
        isConnected,
        connectionState 
    };
}
