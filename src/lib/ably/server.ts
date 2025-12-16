// src/lib/ably/server.ts

import Ably from 'ably';

declare global {
  // eslint-disable-next-line no-var
  var ablyServerInstance: Ably.Rest | undefined;
}

const ablyApiKey = process.env.ABLY_API_KEY;

export function initializeAblyServer(): Ably.Rest | null {
  if (typeof window !== 'undefined') {
    return null;
  }

  if (!ablyApiKey) {
    console.error('❌ [ABLY SERVER] ABLY_API_KEY environment variable is missing');
    return null;
  }

  if (ablyApiKey.split('.').length !== 2) {
    console.error('❌ [ABLY SERVER] ABLY_API_KEY format is invalid');
    return null;
  }

  try {
    if (process.env.NODE_ENV === 'production' || !global.ablyServerInstance) {
      const clientOptions: Ably.Types.ClientOptions = {
        key: ablyApiKey,
        log: { level: (process.env.NODE_ENV === 'development' ? 2 : 1) as any },
        tls: true,
        httpMaxRetryCount: 5,
        httpOpenTimeout: 15000,
        httpRequestTimeout: 30000,
        fallbackHosts: ['a.ably-realtime.com', 'b.ably-realtime.com', 'c.ably-realtime.com'],
        idempotentRestPublishing: true,
      };

      const instance = new Ably.Rest(clientOptions);
      
      if (process.env.NODE_ENV !== 'production') {
        global.ablyServerInstance = instance;
      }
      
      return instance;
    } else {
      return global.ablyServerInstance;
    }
  } catch (error) {
    console.error('❌ [ABLY SERVER] Critical error initializing Ably client:', error);
    return null;
  }
}

export async function getAblyChannel(channelName: string) {
  const ablyServer = initializeAblyServer();
  if (!ablyServer) {
    throw new Error('❌ [ABLY SERVER] Ably client not initialized');
  }
  return ablyServer.channels.get(channelName);
}
