// src/hooks/useAbly.ts - VERSION CORRIGÉE POUR STABILITÉ
'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
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
 * Optimized for stability and multiple component usage.
 */
export function useAbly(): UseAblyReturn {
    const [client, setClient] = useState<Ably.Realtime | null>(null);
    const [connectionError, setConnectionError] = useState<Types.ErrorInfo | null>(null);
    const [connectionState, setConnectionState] = useState<Types.ConnectionState>('initialized');
    
    // ✅ CORRECTION : Références uniques par instance de hook
    const isMountedRef = useRef(true);
    const connectionHandlerIdRef = useRef<string | null>(null);

    useEffect(() => {
        isMountedRef.current = true;
        
        const ablyClient = getAblyClient();
        setClient(ablyClient);

        // ✅ CORRECTION : Handler unique avec gestion d'état cohérente
        const connectionHandler = (stateChange: Types.ConnectionStateChange) => {
            if (!isMountedRef.current) return;
            
            const newState = stateChange.current;
            setConnectionState(newState);
            
            // ✅ CORRECTION : Logique d'erreur améliorée
            if (stateChange.reason) {
                console.error(`❌ [ABLY HOOK] Connection error:`, stateChange.reason);
                setConnectionError(stateChange.reason);
            } else if (newState === 'connected') {
                setConnectionError(null);
            }
        };

        // ✅ CORRECTION : Stocker l'ID du handler pour un nettoyage précis
        ablyClient.connection.on(connectionHandler);
        connectionHandlerIdRef.current = 'connection_state_handler';

        // Définir l'état initial
        if (isMountedRef.current) {
            setConnectionState(ablyClient.connection.state);
            if (ablyClient.connection.errorReason) {
                setConnectionError(ablyClient.connection.errorReason);
            }
        }

        // ✅ CORRECTION : Nettoyage sécurisé uniquement pour ce composant
        return () => {
            isMountedRef.current = false;
            if (connectionHandlerIdRef.current) {
                ablyClient.connection.off(connectionHandler);
                connectionHandlerIdRef.current = null;
            }
        };
    }, []); // ✅ Dépendances vides - effet unique

    const isConnected = connectionState === 'connected';

    // ✅ CORRECTION : Mémoisation optimisée
    return useMemo(() => ({ 
        client, 
        connectionError, 
        isConnected,
        connectionState 
    }), [client, connectionError, isConnected, connectionState]);
}

// ✅ CORRECTION : Hook spécialisé avec gestion d'état améliorée
export function useAblyForSession(sessionId?: string) {
    const { client, connectionError, isConnected, connectionState } = useAbly();
    const [sessionReady, setSessionReady] = useState(false);
    const sessionReadyRef = useRef(false);
    
    useEffect(() => {
        if (!sessionId || !client) {
            setSessionReady(false);
            sessionReadyRef.current = false;
            return;
        }
        
        // ✅ CORRECTION : Logique de sessionReady plus robuste
        const shouldBeReady = isConnected && !connectionError && !!sessionId;
        
        if (shouldBeReady && !sessionReadyRef.current) {
            console.log(`🎯 [ABLY SESSION] - Client ready for session: ${sessionId}`);
            setSessionReady(true);
            sessionReadyRef.current = true;
        } else if (!shouldBeReady && sessionReadyRef.current) {
            console.warn(`⚠️ [ABLY SESSION] - Session ${sessionId} no longer ready`);
            setSessionReady(false);
            sessionReadyRef.current = false;
        }
    }, [sessionId, client, isConnected, connectionError]);
    
    // ✅ CORRECTION : États de chargement plus précis
    const isLoading = connectionState === 'initialized' || connectionState === 'connecting';
    const hasConnectionError = !!connectionError;
    
    return useMemo(() => ({
        client,
        connectionError,
        isConnected,
        connectionState,
        sessionReady: sessionReady && isConnected && !connectionError,
        isLoading,
        hasConnectionError
    }), [client, connectionError, isConnected, connectionState, sessionReady, isLoading]);
}