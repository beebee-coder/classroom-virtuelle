// src/hooks/useAbly.ts - VERSION CORRIGÉE
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { getAblyClient, getAblyClientUsage } from '@/lib/ably/client';
import Ably, { type Types } from 'ably';

interface UseAblyReturn {
  client: Ably.Realtime;
  connectionState: Types.ConnectionState;
  isConnected: boolean;
  connectionError: Types.ErrorInfo | null;
}

// ✅ Singleton pour partager l'état entre toutes les instances du hook
let globalConnectionState: Types.ConnectionState = 'initialized';
let globalIsConnected = false;
let globalConnectionError: Types.ErrorInfo | null = null;
let globalListeners: Set<(state: Types.ConnectionState, isConnected: boolean, error: Types.ErrorInfo | null) => void> = new Set();

// ✅ Stack trace pour debugger les composants utilisateurs
const componentStack = new Map<symbol, string>();

// ✅ Fonction pour mettre à jour tous les listeners
const updateAllListeners = (state: Types.ConnectionState, isConnected: boolean, error: Types.ErrorInfo | null) => {
  globalConnectionState = state;
  globalIsConnected = isConnected;
  globalConnectionError = error;
  
  globalListeners.forEach(listener => {
    listener(state, isConnected, error);
  });
};

// ✅ CORRECTION : Fonction utilitaire pour obtenir le nom du composant appelant
const getCallingComponentName = (): string => {
  try {
    // Tentative de récupération du nom du composant via Error stack
    const error = new Error();
    const stackLines = error.stack?.split('\n') || [];
    
    // Chercher la ligne qui contient le composant React
    for (let i = 3; i < stackLines.length && i < 8; i++) {
      const line = stackLines[i].trim();
      
      // Patterns typiques des composants React/Next.js
      if (line.includes('at ') && !line.includes('useAbly')) {
        // Extraire le nom du composant
        const match = line.match(/at (\w+)/) || line.match(/at ([\w.]+)/);
        if (match && match[1]) {
          const componentName = match[1];
          // Filtrer les noms génériques
          if (!['Object', 'Function', 'eval'].includes(componentName)) {
            return componentName;
          }
        }
        
        // Alternative: extraire depuis le chemin de fichier
        const fileMatch = line.match(/\/([\w-]+)\.(tsx|ts|jsx|js)/);
        if (fileMatch && fileMatch[1]) {
          return fileMatch[1];
        }
      }
    }
  } catch (error) {
    // Fallback silencieux en cas d'erreur
  }
  
  return 'UnknownComponent';
};

export const useAbly = (componentName?: string): UseAblyReturn => {
  // ✅ CORRECTION : Déterminer automatiquement le nom du composant si non fourni
  const resolvedComponentName = useMemo(() => {
    return componentName || getCallingComponentName();
  }, [componentName]);

  const [connectionState, setConnectionState] = useState<Types.ConnectionState>(globalConnectionState);
  const [isConnected, setIsConnected] = useState<boolean>(globalIsConnected);
  const [connectionError, setConnectionError] = useState<Types.ErrorInfo | null>(globalConnectionError);
  
  const listenerIdRef = useRef<symbol>(Symbol(`useAbly-${resolvedComponentName}`));

  // ✅ CORRECTION : Utiliser useMemo pour une instance STABLE du client
  const ablyClient = useMemo(() => {
    console.log(`🎯 [USE ABLY HOOK] ${resolvedComponentName} - Creating/getting Ably client instance`);
    const client = getAblyClient();
    
    // ✅ Vérifier l'état actuel immédiatement
    const currentState = client.connection.state;
    if (currentState !== globalConnectionState) {
      updateAllListeners(currentState, currentState === 'connected', null);
    }
    
    return client;
  }, [resolvedComponentName]);

  useEffect(() => {
    const listenerId = listenerIdRef.current;
    let isMounted = true;

    // ✅ Enregistrer le composant pour le debug
    componentStack.set(listenerId, resolvedComponentName);

    // ✅ CORRECTION : Définir le handler UNE FOIS par instance de composant
    const connectionStateHandler = (stateChange: Types.ConnectionStateChange) => {
      if (!isMounted) return;
      
      const newState = stateChange.current;
      const newIsConnected = newState === 'connected';
      const newError = stateChange.reason || null;
      
      // ✅ Mettre à jour l'état global pour tous les composants
      updateAllListeners(newState, newIsConnected, newError);
    };

    // ✅ S'abonner aux changements d'état globaux
    const globalStateListener = (state: Types.ConnectionState, connected: boolean, error: Types.ErrorInfo | null) => {
      if (isMounted) {
        setConnectionState(state);
        setIsConnected(connected);
        setConnectionError(error);
      }
    };

    // ✅ Ajouter ce composant aux listeners globaux
    globalListeners.add(globalStateListener);

    // ✅ S'abonner aux événements de connexion du client
    ablyClient.connection.on(connectionStateHandler);

    // ✅ Log de debug pour tracer les instances
    const activeComponents = Array.from(componentStack.values());
    console.log(`🔧 [USE ABLY HOOK] ${resolvedComponentName} monté -`, {
      listeners: globalListeners.size,
      refCount: getAblyClientUsage().refCount,
      activeComponents,
      totalComponents: activeComponents.length
    });

    return () => {
      isMounted = false;
      
      // ✅ Nettoyer les listeners
      globalListeners.delete(globalStateListener);
      componentStack.delete(listenerId);
      ablyClient.connection.off(connectionStateHandler);
      
      console.log(`🧹 [USE ABLY HOOK] ${resolvedComponentName} démonté - Listeners restants: ${globalListeners.size}`);
    };
  }, [ablyClient, resolvedComponentName]);

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
  return {
    globalListenersCount: globalListeners.size,
    globalConnectionState,
    globalIsConnected,
    globalConnectionError: globalConnectionError?.message || null,
    clientUsage: getAblyClientUsage(),
    activeComponents,
    componentCount: activeComponents.length
  };
};

// ✅ FONCTION : Log détaillé pour debug
export const logUseAblyDetails = () => {
  const stats = getUseAblyStats();
  console.group('🔍 [USE ABLY HOOK] Détails comports');
  console.log('📊 Statistiques:', stats);
  console.log('🧩 Composants actifs:', stats.activeComponents);
  console.log('🔗 État client:', stats.clientUsage);
  console.groupEnd();
  return stats;
};
