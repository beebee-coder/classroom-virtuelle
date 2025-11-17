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
    
    // ✅ CORRECTION : Références pour éviter les boucles de rendu
    const isMountedRef = useRef(true);
    const connectionHandlerRef = useRef<((stateChange: Types.ConnectionStateChange) => void) | null>(null);

    useEffect(() => {
        isMountedRef.current = true;
        
        const ablyClient = getAblyClient();
        setClient(ablyClient);

        // ✅ CORRECTION : Handler unique et stable
        if (!connectionHandlerRef.current) {
            connectionHandlerRef.current = (stateChange: Types.ConnectionStateChange) => {
                if (!isMountedRef.current) return;
                
                setConnectionState(stateChange.current);
                if (stateChange.reason) {
                    setConnectionError(stateChange.reason);
                } else {
                    setConnectionError(null);
                }
            };
        }

        // ✅ CORRECTION : Écouter les changements d'état
        ablyClient.connection.on(connectionHandlerRef.current);

        // Définir l'état initial
        if (isMountedRef.current) {
            setConnectionState(ablyClient.connection.state);
            if (ablyClient.connection.errorReason) {
                setConnectionError(ablyClient.connection.errorReason);
            }
        }

        // ✅ CORRECTION : Nettoyage minimal - NE PAS déconnecter les listeners globaux
        return () => {
            isMountedRef.current = false;
            // NOTE: Nous ne nettoyons PAS les listeners ici car le client est global
            // et partagé entre tous les composants. Le nettoyage est géré par closeAblyClient.
        };
    }, []); // ✅ Dépendances vides - effet unique

    const isConnected = connectionState === 'connected';

    // ✅ CORRECTION : Mémoisation pour éviter les rendus inutiles
    return useMemo(() => ({ 
        client, 
        connectionError, 
        isConnected,
        connectionState 
    }), [client, connectionError, isConnected, connectionState]);
}

// ✅ NOUVEAU : Hook spécialisé pour les sessions avec gestion d'erreur améliorée
export function useAblyForSession(sessionId?: string) {
    const { client, connectionError, isConnected, connectionState } = useAbly();
    
    const [sessionReady, setSessionReady] = useState(false);
    
    useEffect(() => {
        if (!sessionId || !client) return;
        
        // ✅ CORRECTION : Vérification de santé de connexion pour les sessions
        if (isConnected) {
            console.log(`🎯 [ABLY SESSION] - Client ready for session: ${sessionId}`);
            setSessionReady(true);
        } else if (connectionError) {
            console.error(`❌ [ABLY SESSION] - Connection error for session ${sessionId}:`, connectionError);
            setSessionReady(false);
        }
    }, [sessionId, client, isConnected, connectionError]);
    
    return {
        client,
        connectionError,
        isConnected,
        connectionState,
        sessionReady: sessionReady && isConnected,
        isLoading: connectionState === 'initialized' || connectionState === 'connecting'
    };
}