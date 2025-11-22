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
 * @param componentName The name of the component using the hook, for debugging.
 * @returns The current connection status and a user-friendly error message if any.
 */
export function useAblyHealth(componentName: string = 'UnknownHealthUser'): AblyHealthState {
    const { client, connectionState, connectionError, isConnected } = useAbly(componentName);
    
    const [error, setError] = useState<string | null>(null);
    
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
            
            if (stateChange.reason) {
                console.error('[useAblyHealth] - Connection error reason:', stateChange.reason);
                const friendlyError = getFriendlyErrorMessage(stateChange.reason);
                setError(friendlyError);
                
                if (stateChange.current === 'failed' || stateChange.current === 'suspended') {
                    console.error(`[useAblyHealth] - Critical connection error: ${friendlyError}`);
                }
            } else {
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
