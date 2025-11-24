// src/hooks/useAbly.ts - VERSION CORRIGÉE
'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getAblyClient, getAblyClientUsage } from '@/lib/ably/client';
import Ably, { type Types } from 'ably';

interface UseAblyReturn {
  client: Ably.Realtime;
  connectionState: Types.ConnectionState;
  isConnected: boolean;
  connectionError: Types.ErrorInfo | null;
}

// ✅ CORRECTION : Singleton amélioré avec gestion de mémoire
let globalConnectionState: Types.ConnectionState = 'initialized';
let globalIsConnected = false;
let globalConnectionError: Types.ErrorInfo | null = null;

// ✅ CORRECTION : Interface pour les listeners avec gestion de cycle de vie
interface GlobalListener {
  id: symbol;
  callback: (state: Types.ConnectionState, isConnected: boolean, error: Types.ErrorInfo | null) => void;
  componentName: string;
}

let globalListeners: Map<symbol, GlobalListener> = new Map();

// ✅ CORRECTION : Stack trace améliorée avec nettoyage automatique
const componentStack = new Map<symbol, string>();

// ✅ CORRECTION : Fonction pour mettre à jour tous les listeners avec gestion d'erreurs
const updateAllListeners = (state: Types.ConnectionState, isConnected: boolean, error: Types.ErrorInfo | null) => {
  globalConnectionState = state;
  globalIsConnected = isConnected;
  globalConnectionError = error;
  
  // ✅ CORRECTION : Parcourir avec gestion d'erreurs pour chaque listener
  globalListeners.forEach((listener, id) => {
    try {
      listener.callback(state, isConnected, error);
    } catch (error) {
      console.error(`❌ [USE ABLY HOOK] Erreur dans le listener de ${listener.componentName}:`, error);
      // Nettoyer le listener problématique
      globalListeners.delete(id);
      componentStack.delete(id);
    }
  });
};

// ✅ CORRECTION : Fonction utilitaire améliorée pour obtenir le nom du composant
const getCallingComponentName = (): string => {
  try {
    const error = new Error();
    const stackLines = error.stack?.split('\n') || [];
    
    for (let i = 3; i < stackLines.length && i < 8; i++) {
      const line = stackLines[i].trim();
      
      if (line.includes('at ') && !line.includes('useAbly')) {
        const match = line.match(/at (\w+)/) || line.match(/at ([\w.]+)/);
        if (match && match[1]) {
          const componentName = match[1];
          if (!['Object', 'Function', 'eval'].includes(componentName)) {
            return componentName;
          }
        }
        
        const fileMatch = line.match(/\/([\w-]+)\.(tsx|ts|jsx|js)/);
        if (fileMatch && fileMatch[1]) {
          return fileMatch[1];
        }
      }
    }
  } catch (error) {
    // Fallback silencieux
  }
  
  return 'UnknownComponent';
};

export const useAbly = (componentName?: string): UseAblyReturn => {
  // ✅ CORRECTION : useMemo pour nom de composant stable
  const resolvedComponentName = useMemo(() => {
    return componentName || getCallingComponentName();
  }, [componentName]);

  const [connectionState, setConnectionState] = useState<Types.ConnectionState>(globalConnectionState);
  const [isConnected, setIsConnected] = useState<boolean>(globalIsConnected);
  const [connectionError, setConnectionError] = useState<Types.ErrorInfo | null>(globalConnectionError);
  
  // ✅ CORRECTION : useRef pour ID stable
  const listenerIdRef = useRef<symbol>(Symbol(`useAbly-${resolvedComponentName}`));

  // ✅ CORRECTION : useMemo pour client Ably stable avec vérification d'état
  const ablyClient = useMemo(() => {
    console.log(`🎯 [USE ABLY HOOK] ${resolvedComponentName} - Creating/getting Ably client instance`);
    const client = getAblyClient();
    
    // Vérifier l'état actuel immédiatement
    const currentState = client.connection.state;
    if (currentState !== globalConnectionState) {
      updateAllListeners(currentState, currentState === 'connected', null);
    }
    
    return client;
  }, [resolvedComponentName]);

  // ✅ CORRECTION : Callback stable pour les mises à jour d'état
  const handleGlobalStateUpdate = useCallback((
    state: Types.ConnectionState, 
    connected: boolean, 
    error: Types.ErrorInfo | null
  ) => {
    setConnectionState(state);
    setIsConnected(connected);
    setConnectionError(error);
  }, []);

  // ✅ CORRECTION : Callback stable pour les changements d'état de connexion
  const handleConnectionStateChange = useCallback((stateChange: Types.ConnectionStateChange) => {
    const newState = stateChange.current;
    const newIsConnected = newState === 'connected';
    const newError = stateChange.reason || null;
    
    updateAllListeners(newState, newIsConnected, newError);
  }, []);

  useEffect(() => {
    const listenerId = listenerIdRef.current;
    let isMounted = true;

    // ✅ CORRECTION : Enregistrement du composant
    componentStack.set(listenerId, resolvedComponentName);

    // ✅ CORRECTION : Création du listener global avec référence stable
    const globalListener: GlobalListener = {
      id: listenerId,
      callback: handleGlobalStateUpdate,
      componentName: resolvedComponentName
    };

    // ✅ CORRECTION : Ajout au Map global
    globalListeners.set(listenerId, globalListener);

    // ✅ CORRECTION : Abonnement aux événements avec référence stable
    ablyClient.connection.on(handleConnectionStateChange);

    // ✅ CORRECTION : Mise à jour initiale de l'état
    const currentState = ablyClient.connection.state;
    if (currentState !== globalConnectionState) {
      updateAllListeners(currentState, currentState === 'connected', null);
    }

    // Log de debug
    const activeComponents = Array.from(componentStack.values());
    console.log(`🔧 [USE ABLY HOOK] ${resolvedComponentName} monté -`, {
      listeners: globalListeners.size,
      refCount: getAblyClientUsage().refCount,
      activeComponents,
      totalComponents: activeComponents.length
    });

    // ✅ CORRECTION : Nettoyage COMPLET et ROBUSTE
    return () => {
      isMounted = false;
      
      // Nettoyer le listener global
      globalListeners.delete(listenerId);
      componentStack.delete(listenerId);
      
      // ✅ CORRECTION IMPORTANTE : Désabonnement explicite avec la même référence
      ablyClient.connection.off(handleConnectionStateChange);
      
      console.log(`🧹 [USE ABLY HOOK] ${resolvedComponentName} démonté - Listeners restants: ${globalListeners.size}`);
      
      // ✅ CORRECTION : Log détaillé en développement pour debugger les fuites
      if (process.env.NODE_ENV === 'development' && globalListeners.size === 0) {
        console.log('✅ [USE ABLY HOOK] Tous les listeners nettoyés - Aucune fuite mémoire');
      }
    };
  }, [
    ablyClient, 
    resolvedComponentName, 
    handleGlobalStateUpdate, 
    handleConnectionStateChange // ✅ CORRECTION : Dépendance ajoutée
  ]);

  return {
    client: ablyClient,
    connectionState,
    isConnected,
    connectionError
  };
};

// ✅ FONCTION DE DÉBOGAGE AMÉLIORÉE
export const getUseAblyStats = () => {
  const activeComponents = Array.from(componentStack.values());
  const listenersInfo = Array.from(globalListeners.values()).map(l => ({
    id: l.id.description,
    component: l.componentName
  }));
  
  return {
    globalListenersCount: globalListeners.size,
    globalConnectionState,
    globalIsConnected,
    globalConnectionError: globalConnectionError?.message || null,
    clientUsage: getAblyClientUsage(),
    activeComponents,
    componentCount: activeComponents.length,
    listenersInfo
  };
};

// ✅ FONCTION : Log détaillé pour debug
export const logUseAblyDetails = () => {
  const stats = getUseAblyStats();
  console.group('🔍 [USE ABLY HOOK] Détails composants');
  console.log('📊 Statistiques:', stats);
  console.log('🧩 Composants actifs:', stats.activeComponents);
  console.log('👂 Listeners détaillés:', stats.listenersInfo);
  console.log('🔗 État client:', stats.clientUsage);
  console.groupEnd();
  return stats;
};

// ✅ FONCTION : Nettoyage d'urgence pour les tests
export const emergencyCleanup = () => {
  const previousSize = globalListeners.size;
  globalListeners.clear();
  componentStack.clear();
  console.log(`🚨 [USE ABLY HOOK] Nettoyage d'urgence - ${previousSize} listeners supprimés`);
};