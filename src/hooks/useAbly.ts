// src/hooks/useAbly.ts - VERSION CORRIGÉE POUR STABILITÉ AVANCÉE
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getAblyClient, getAblyClientUsage } from '@/lib/ably/client';
import Ably, {
  type Realtime,
  type ConnectionState,
  type ErrorInfo,
  type ConnectionStateChange,
} from 'ably';

interface UseAblyReturn {
  client: Ably.Realtime;
  connectionState: ConnectionState;
  isConnected: boolean;
  connectionError: ErrorInfo | null;
}

let globalConnectionState: ConnectionState = 'initialized';
let globalIsConnected = false;
let globalConnectionError: ErrorInfo | null = null;

interface GlobalListener {
  id: symbol;
  callback: (state: ConnectionState, isConnected: boolean, error: ErrorInfo | null) => void;
  componentName: string;
}

let globalListeners: Map<symbol, GlobalListener> = new Map();
const componentStack = new Map<symbol, string>();

const updateAllListeners = (state: ConnectionState, isConnected: boolean, error: ErrorInfo | null) => {
  globalConnectionState = state;
  globalIsConnected = isConnected;
  globalConnectionError = error;
  
  globalListeners.forEach((listener, id) => {
    try {
      listener.callback(state, isConnected, error);
    } catch (error) {
      console.error(`❌ [USE ABLY HOOK] Erreur dans le listener de ${listener.componentName}:`, error);
      globalListeners.delete(id);
      componentStack.delete(id);
    }
  });
};

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
  const resolvedComponentName = useRef(componentName || getCallingComponentName());

  const [connectionState, setConnectionState] = useState<ConnectionState>(globalConnectionState);
  const [isConnected, setIsConnected] = useState<boolean>(globalIsConnected);
  const [connectionError, setConnectionError] = useState<ErrorInfo | null>(globalConnectionError);
  
  const listenerIdRef = useRef<symbol>(Symbol(`useAbly-${resolvedComponentName.current}`));

  const ablyClient = useRef(getAblyClient());

  const handleGlobalStateUpdate = useCallback((
    state: ConnectionState, 
    connected: boolean, 
    error: ErrorInfo | null
  ) => {
    setConnectionState(state);
    setIsConnected(connected);
    setConnectionError(error);
  }, []);

  const handleConnectionStateChange = useCallback((stateChange: ConnectionStateChange) => {
    const newState = stateChange.current;
    const newIsConnected = newState === 'connected';
    const newError = stateChange.reason || null;
    
    updateAllListeners(newState, newIsConnected, newError);
  }, []);
  
  useEffect(() => {
    const listenerId = listenerIdRef.current;
    const client = ablyClient.current;
    
    componentStack.set(listenerId, resolvedComponentName.current);
    
    const globalListener: GlobalListener = {
      id: listenerId,
      callback: handleGlobalStateUpdate,
      componentName: resolvedComponentName.current
    };
    
    globalListeners.set(listenerId, globalListener);
    client.connection.on(handleConnectionStateChange);

    const currentState = client.connection.state;
    if (currentState !== globalConnectionState) {
      updateAllListeners(currentState, currentState === 'connected', null);
    }

    const activeComponents = Array.from(componentStack.values());
    console.log(`🔧 [USE ABLY HOOK] ${resolvedComponentName.current} monté -`, {
      listeners: globalListeners.size,
      refCount: getAblyClientUsage().refCount,
      activeComponents: activeComponents.length,
    });

    return () => {
      globalListeners.delete(listenerId);
      componentStack.delete(listenerId);
      client.connection.off(handleConnectionStateChange);
      
      console.log(`🧹 [USE ABLY HOOK] ${resolvedComponentName.current} démonté - Listeners restants: ${globalListeners.size}`);
    };
  }, [handleGlobalStateUpdate, handleConnectionStateChange]);

  return {
    client: ablyClient.current,
    connectionState,
    isConnected,
    connectionError
  };
};

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

export const emergencyCleanup = () => {
  const previousSize = globalListeners.size;
  globalListeners.clear();
  componentStack.clear();
  console.log(`🚨 [USE ABLY HOOK] Nettoyage d'urgence - ${previousSize} listeners supprimés`);
};
