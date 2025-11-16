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
    const { client, connectionState, connectionError, isConnected } = useAbly();
    
    // CORRECTION: Utiliser directement les états de useAbly au lieu de dupliquer la logique
    const [status, setStatus] = useState<AblyConnectionStatus>('initialized');
    const [error, setError] = useState<string | null>(null);
    
    // CORRECTION: Calcul plus simple basé sur connectionState
    const isLoading = connectionState === 'initialized' || connectionState === 'connecting';

    useEffect(() => {
        // CORRECTION: Mettre à jour le statut basé sur connectionState
        if (connectionState) {
            setStatus(connectionState as AblyConnectionStatus);
        }
    }, [connectionState]);

    useEffect(() => {
        if (!client) {
            console.log(`[useAblyHealth] - No client available, using connectionState: ${connectionState}`);
            setStatus(connectionState as AblyConnectionStatus || 'initialized');
            return;
        }

        console.log(`[useAblyHealth] - Setting up health monitoring for shared Ably client, current state: ${connectionState}`);

        const handleStateChange = (stateChange: Ably.Types.ConnectionStateChange) => {
            console.log(`[useAblyHealth] - Ably connection state change: ${stateChange.previous} -> ${stateChange.current}`);
            
            // CORRECTION: Synchroniser avec l'état principal
            setStatus(stateChange.current as AblyConnectionStatus);

            if (stateChange.reason) {
                console.error('[useAblyHealth] - Connection error reason:', stateChange.reason);
                const friendlyError = getFriendlyErrorMessage(stateChange.reason);
                setError(friendlyError);
                
                // CORRECTION: Toast pour les erreurs critiques
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

        // CORRECTION: S'abonner aux changements d'état
        client.connection.on(handleStateChange);
        
        // CORRECTION: Définir l'état initial basé sur le client actuel
        setStatus(client.connection.state as AblyConnectionStatus);
        
        return () => {
            console.log(`[useAblyHealth] - Cleaning up health monitoring`);
            client.connection.off(handleStateChange);
        };
    }, [client]); // CORRECTION: Dépendance uniquement sur client

    // CORRECTION: Gestion centralisée des erreurs de connexion
    useEffect(() => {
        if (connectionError) {
            console.error('[useAblyHealth] - Connection error from useAbly hook:', connectionError);
            const friendlyError = getFriendlyErrorMessage(connectionError);
            setError(friendlyError);
        } else if (status === 'connected') {
            // CORRECTION: Effacer l'erreur quand la connexion est rétablie
            setError(null);
        }
    }, [connectionError, status]);

    // CORRECTION: Calculer isConnected basé sur le statut actuel
    const isConnectionActive = status === 'connected';

    return { 
        status, 
        error,
        isLoading,
        isConnected: isConnectionActive
    };
}