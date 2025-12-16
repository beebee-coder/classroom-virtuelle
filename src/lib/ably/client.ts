// src/lib/ably/client.ts
'use client';
import Ably, { type Types as AblyTypes } from 'ably';

let globalClient: Ably.Realtime | null = null;
let refCount = 0;
let connectionHandlerAttached = false;

export const getAblyClientUsage = (): { refCount: number; clientState: string; hasClient: boolean } => {
  return {
    refCount,
    clientState: globalClient?.connection.state || 'no_client',
    hasClient: !!globalClient
  };
};

const cleanupFaultyClient = (): void => {
  if (globalClient && (
    globalClient.connection.state === 'failed' || 
    globalClient.connection.state === 'closed' ||
    globalClient.connection.state === 'suspended'
  )) {
    try {
      globalClient.close();
    } catch (error) {
    }
    globalClient = null;
    refCount = 0;
    connectionHandlerAttached = false;
  }
};

export const getAblyClient = (): Ably.Realtime => {
  cleanupFaultyClient();

  if (globalClient) {
    const currentState = globalClient.connection.state;
    if (currentState === 'connected' || currentState === 'connecting' || currentState === 'initialized') {
      refCount++;
      return globalClient;
    } else {
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
  
  const clientOptions: AblyTypes.ClientOptions = {
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
    log: { level: process.env.NODE_ENV === 'development' ? 2 : 1 },
    maxMessageSize: 65536,
    fallbackHosts: ['a.ably-realtime.com', 'b.ably-realtime.com', 'c.ably-realtime.com']
  };

  const ablyClient = new Ably.Realtime(clientOptions);

  if (!connectionHandlerAttached) {
    const connectionHandler = (stateChange: AblyTypes.ConnectionStateChange) => {
      const previous = stateChange.previous;
      const current = stateChange.current;
      
      switch (current) {
        case 'connected':
          break;
          
        case 'failed':
          break;
          
        case 'disconnected':
          break;
          
        case 'suspended':
          break;
          
        case 'closing':
          break;
          
        case 'closed':
          break;
      }

      if (stateChange.reason && (stateChange.reason.code >= 40000 || current === 'failed')) {
      }
    };

    ablyClient.connection.on(connectionHandler);
    connectionHandlerAttached = true;

    ablyClient.connection.on('failed', (stateChange: AblyTypes.ConnectionStateChange) => {
      if (stateChange.reason?.code === 40100) {
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
  
  if (refCount <= 0 && globalClient) {
    const currentState = globalClient.connection.state;
    
    try {
      if (currentState === 'connected' || currentState === 'connecting') {
        globalClient.close();
      }
    } catch (error) {
    } finally {
      globalClient = null;
      refCount = 0;
      connectionHandlerAttached = false;
    }
  } else if (globalClient) {
  }
};

export const getAblyConnectionState = (): string | null => {
  return globalClient?.connection.state || null;
};

export const renewAblyAuth = async (): Promise<boolean> => {
  if (!globalClient) {
    return false;
  }

  try {
    await globalClient.auth.authorize();
    return true;
  } catch (error) {
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
    try {
      globalClient.close();
    } catch (error) {
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
  resetAblyClient();
};

export const getAblyDetailedStats = () => {
  return {
    globalClientExists: !!globalClient,
    refCount,
    connectionHandlerAttached,
    connectionState: globalClient?.connection.state || 'none',
    clientId: globalClient?.auth.clientId || 'none',
    connectionId: globalClient?.connection.id || 'none',
    connectionKey: globalClient?.connection.key || 'none',
    connectionRecoveryKey: (globalClient?.connection as any).recoveryKey || 'none'
  };
};
