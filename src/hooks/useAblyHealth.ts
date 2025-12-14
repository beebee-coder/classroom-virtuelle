// src/hooks/useAblyHealth.ts - VERSION CORRIGÉE
'use client';

import { useState, useEffect } from 'react';
import Ably from 'ably';
import { useNamedAbly } from './useNamedAbly'; 
import { getFriendlyErrorMessage } from '@/lib/ably/error-handling';

export type AblyConnectionStatus = 'initialized' | 'connecting' | 'connected' | 'disconnected' | 'suspended' | 'closing' | 'closed' | 'failed';

interface AblyHealthState {
    status: AblyConnectionStatus;
    error: string | null;
    isLoading: boolean;
    isConnected: boolean;
}

export function useAblyHealth(componentName: string): AblyHealthState {
    const { client, connectionState, connectionError, isConnected } = useNamedAbly(componentName);
    
    const [error, setError] = useState<string | null>(null);
    
    const status = (connectionState || 'initialized') as AblyConnectionStatus;
    const isLoading = connectionState === 'initialized' || connectionState === 'connecting';

    useEffect(() => {
        if (connectionError) {
            console.error(`[useAblyHealth - ${componentName}] - Connection error from hook:`, connectionError);
            const friendlyError = getFriendlyErrorMessage(connectionError);
            setError(friendlyError);
        } else if (status === 'connected') {
            setError(null);
        }
    }, [connectionError, status, componentName]);

    return { 
        status, 
        error,
        isLoading,
        isConnected: isConnected || status === 'connected'
    };
}
