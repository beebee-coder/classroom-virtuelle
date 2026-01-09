// src/lib/ably/client.ts - VERSION CORRIGÉE POUR ABLY v2+ ET FLUX AUTH TRACE
'use client';

import Ably, {
  type Realtime,
  type ClientOptions,
  type ConnectionStateChange,
} from 'ably';

// Singleton pour partager l'instance client entre les composants
let globalClient: Realtime | null = null;
let refCount = 0;
let connectionHandlerAttached = false;

// ✅ NOUVELLE FONCTION : Debug de l'utilisation du client
export const getAblyClientUsage = (): { refCount: number; clientState: string; hasClient: boolean } => {
  return {
    refCount,
    clientState: globalClient?.connection.state || 'no_client',
    hasClient: !!globalClient
  };
};

// ✅ NOUVELLE FONCTION : Nettoyage des clients défectueux
const cleanupFaultyClient = (): void => {
  if (globalClient && (
    globalClient.connection.state === 'failed' || 
    globalClient.connection.state === 'closed' ||
    globalClient.connection.state === 'suspended'
  )) {
    console.log('🧹 [ABLY CLIENT] Nettoyage du client en état critique:', globalClient.connection.state);
    try {
      globalClient.close();
    } catch (error) {
      console.warn('⚠️ [ABLY CLIENT] Erreur lors du nettoyage du client défectueux:', error);
    }
    globalClient = null;
    refCount = 0;
    connectionHandlerAttached = false;
  }
};

/**
 * Fonction pour obtenir l'instance unique du client Ably.
 * Optimisée pour l'environnement serverless de Vercel.
 */
export const getAblyClient = (): Realtime => {
  // ✅ CORRECTION : Vérifier et nettoyer les clients défectueux AVANT réutilisation
  cleanupFaultyClient();

  if (globalClient) {
    const currentState = globalClient.connection.state;
    if (currentState === 'connected' || currentState === 'connecting' || currentState === 'initialized') {
      console.log(`🔄 [ABLY CLIENT] Reusing existing global Ably client instance (state: ${currentState}, refCount: ${refCount + 1})`);
      refCount++;
      return globalClient;
    } else {
      console.warn(`⚠️ [ABLY CLIENT] Client existant en état ${currentState}, création nouvelle instance`);
      globalClient = null;
      refCount = 0;
      connectionHandlerAttached = false;
    }
  }

  const getAuthUrl = (): string => {
    if (typeof window !== 'undefined') {
      const baseUrl = window.location.origin;
      return `${baseUrl}/api/ably/auth`;
    }
    return '/api/ably/auth';
  };

  const authUrl = getAuthUrl();

  // ✅ CORRECTION : Utilisation directe du type `ClientOptions` (v2+)
  const clientOptions: ClientOptions = {
    authUrl: authUrl,
    authMethod: 'POST',
    disconnectedRetryTimeout: 10000,
    suspendedRetryTimeout: 30000,
    echoMessages: false,
    autoConnect: true,
    queueMessages: true,
    closeOnUnload: false,
    transports: ['web_socket'],
    transportParams: {
      requestTimeout: 30000
    },
    httpRequestTimeout: 30000,
    httpMaxRetryCount: 3,
    logLevel: process.env.NODE_ENV === 'development' ? 2 : 1,
    maxMessageSize: 65536,
    fallbackHosts: ['a.ably-realtime.com', 'b.ably-realtime.com', 'c.ably-realtime.com']
  };

  console.log('✅ [ABLY CLIENT] Creating new global Ably Realtime client instance optimized for Vercel.');
  console.log(`🔐 [ABLY CLIENT] Using auth URL: ${authUrl}`);

  // 🔍 TRACE DÉBUT FLUX AUTH CLIENT
  console.time('⏱️ [ABLY AUTH] Full auth + connect time');
  console.log('📡 [ABLY AUTH] Initiating Ably client connection (will trigger /api/ably/auth)');

  const ablyClient = new Ably.Realtime(clientOptions);

  if (!connectionHandlerAttached) {
    const connectionHandler = (stateChange: ConnectionStateChange) => {
      const previous = stateChange.previous;
      const current = stateChange.current;
      
      console.log(`🔌 [ABLY CLIENT] Connection state: ${previous} -> ${current}`);
      
      switch (current) {
        case 'connected':
          console.log(`🎯 [ABLY CLIENT] Client connected with real clientId: ${ablyClient.auth.clientId}`);
          console.timeEnd('⏱️ [ABLY AUTH] Full auth + connect time');
          break;
          
        case 'failed':
          console.error(`❌ [ABLY CLIENT] Connection failed:`, stateChange.reason);
          if (stateChange.reason?.code === 40142) {
            console.warn('🔄 [ABLY CLIENT] Token expired, will attempt renewal');
          }
          console.timeEnd('⏱️ [ABLY AUTH] Full auth + connect time');
          break;
          
        case 'disconnected':
          console.warn(`⚠️ [ABLY CLIENT] Connection disconnected`);
          if (stateChange.reason?.code === 80003) {
            console.warn('🌐 [ABLY CLIENT] WebSocket timeout (80003) - Vercel environment');
          }
          break;
          
        case 'suspended':
          console.warn(`⏸️ [ABLY CLIENT] Connection suspended`);
          break;
          
        case 'closing':
          console.log(`🚪 [ABLY CLIENT] Connection closing`);
          break;
          
        case 'closed':
          console.log(`🔒 [ABLY CLIENT] Connection closed`);
          console.timeEnd('⏱️ [ABLY AUTH] Full auth + connect time');
          break;
      }

      if (stateChange.reason && (stateChange.reason.code >= 40000 || current === 'failed')) {
        console.error(`❌ [ABLY CLIENT] Connection error:`, {
          code: stateChange.reason.code,
          statusCode: stateChange.reason.statusCode,
          message: stateChange.reason.message
        });
      }
    };

    ablyClient.connection.on(connectionHandler);
    connectionHandlerAttached = true;

    ablyClient.connection.on('failed', (stateChange: ConnectionStateChange) => {
      if (stateChange.reason?.code === 40100) {
        console.error('❌ [ABLY CLIENT] Authentication failed - check auth endpoint');
      }
    });
  }

  globalClient = ablyClient;
  refCount = 1;

  return ablyClient;
};

export const closeAblyClient = (): void => {
  if (refCount > 0) {
    refCount--;
  }
  
  console.log(`📊 [ABLY CLIENT] Close requested (refCount: ${refCount})`);
  
  if (refCount <= 0 && globalClient) {
    const currentState = globalClient.connection.state;
    console.log(`🚪 [ABLY CLIENT] Closing global Ably client instance (state: ${currentState})`);
    
    try {
      if (currentState === 'connected' || currentState === 'connecting') {
        globalClient.close();
      }
    } catch (error) {
      console.warn('⚠️ [ABLY CLIENT] Error during close:', error);
    } finally {
      globalClient = null;
      refCount = 0;
      connectionHandlerAttached = false;
    }
  } else if (globalClient) {
    console.log(`📊 [ABLY CLIENT] Client still in use by ${refCount} components`);
  }
};

export const getAblyConnectionState = (): string | null => {
  return globalClient?.connection.state || null;
};

export const renewAblyAuth = async (): Promise<boolean> => {
  if (!globalClient) {
    console.warn('❌ [ABLY CLIENT] No client available for auth renewal');
    return false;
  }

  try {
    console.log('🔄 [ABLY CLIENT] Manually renewing authentication token...');
    await globalClient.auth.authorize();
    console.log('✅ [ABLY CLIENT] Authentication token renewed successfully');
    return true;
  } catch (error) {
    console.error('❌ [ABLY CLIENT] Error renewing authentication token:', error);
    return false;
  }
};

export const checkAblyHealth = (): { 
  isHealthy: boolean; 
  state: string; 
  clientId?: string;
  refCount: number;
  canBeReused: boolean;
} => {
  if (!globalClient) {
    return { isHealthy: false, state: 'no_client', refCount, canBeReused: false };
  }
  
  const state = globalClient.connection.state;
  const isHealthy = state === 'connected';
  const canBeReused = state === 'connected' || state === 'connecting' || state === 'initialized';

  return {
    isHealthy,
    state,
    clientId: globalClient.auth.clientId || undefined,
    refCount,
    canBeReused
  };
};

export const resetAblyClient = (): void => {
  if (globalClient) {
    console.log('♻️ [ABLY CLIENT] Resetting Ably client for hot reload');
    try {
      globalClient.close();
    } catch (error) {
      // Ignorer les erreurs lors du reset
    }
  }
  globalClient = null;
  refCount = 0;
  connectionHandlerAttached = false;
};

export const isAblyClientReady = (): boolean => {
  return !!globalClient && 
         (globalClient.connection.state === 'connected' || 
          globalClient.connection.state === 'connecting');
};

export const forceResetAblyClient = (reason?: string): void => {
  console.warn(`🔄 [ABLY CLIENT] Force reset requested${reason ? `: ${reason}` : ''}`);
  resetAblyClient();
};

// ✅ CORRECTION : Suppression de `connection.recoveryKey` (propriété supprimée en v2+)
export const getAblyDetailedStats = () => {
  return {
    globalClientExists: !!globalClient,
    refCount,
    connectionHandlerAttached,
    connectionState: globalClient?.connection.state || 'none',
    clientId: globalClient?.auth.clientId || 'none',
    connectionId: globalClient?.connection.id || 'none',
    connectionKey: globalClient?.connection.key || 'none',
    // 🚫 `recoveryKey` n'existe plus en Ably v2+
    // connectionRecoveryKey: globalClient?.connection.recoveryKey || 'none'
  };
};