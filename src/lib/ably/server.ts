// src/lib/ably/server.ts
'use server';
import Ably from 'ably';

declare global {
  // eslint-disable-next-line no-var
  var ablyServerInstance: Ably.Rest | undefined;
}

const ablyApiKey = process.env.ABLY_API_KEY;

// ✅ CORRECTION : Initialisation robuste avec gestion d'erreur améliorée
let ablyServer: Ably.Rest | null = null;

// ✅ NOUVELLE FONCTION : Validation de la clé API
const validateAblyApiKey = (key: string | undefined): boolean => {
  if (!key) {
    console.error('❌ [ABLY SERVER] ABLY_API_KEY environment variable is missing');
    return false;
  }
  
  if (key.split('.').length !== 2) {
    console.error('❌ [ABLY SERVER] ABLY_API_KEY format is invalid');
    return false;
  }
  
  return true;
};

// ✅ CORRECTION : Initialisation avec gestion d'erreur robuste
if (typeof window === 'undefined') {
  if (validateAblyApiKey(ablyApiKey)) {
    try {
      // ✅ CORRECTION : Configuration optimisée pour Vercel (sans erreurs TypeScript)
      const clientOptions: Ably.Types.ClientOptions = {
        key: ablyApiKey!,
        logLevel: (process.env.NODE_ENV === 'development' ? 2 : 1) as any, // ✅ FIX: Type assertion
        tls: true,
        httpMaxRetryCount: 5, // ✅ AUGMENTÉ : Plus de tentatives pour Vercel
        httpOpenTimeout: 15000, // ✅ AJOUTÉ : Timeout étendu pour cold starts
        httpRequestTimeout: 30000, // ✅ AJOUTÉ : Timeout long pour Vercel
        fallbackHosts: ['a.ably-realtime.com', 'b.ably-realtime.com', 'c.ably-realtime.com'], // ✅ AJOUTÉ : Résilience
        idempotentRestPublishing: true, // ✅ AJOUTÉ : Éviter les doublons
      };

      if (process.env.NODE_ENV === 'production' || !global.ablyServerInstance) {
        ablyServer = new Ably.Rest(clientOptions);
        if (process.env.NODE_ENV !== 'production') {
            global.ablyServerInstance = ablyServer;
        }
      } else {
        ablyServer = global.ablyServerInstance;
      }

    } catch (error: any) { // ✅ CORRECTION : Type explicit pour error
      console.error('❌ [ABLY SERVER] Critical error initializing Ably client:', error);
      ablyServer = null;
    }
  } else {
    console.error('❌ [ABLY SERVER] Ably API key validation failed');
  }
}

// ✅ CORRECTION : Export sécurisé avec fonction helper améliorée
export const getServerAblyClient = (): Ably.Rest => {
  if (typeof window !== 'undefined') {
    throw new Error('❌ [ABLY SERVER] Cannot use server Ably client in browser context');
  }
  
  if (!ablyServer) {
    if (validateAblyApiKey(ablyApiKey)) {
        try {
            ablyServer = new Ably.Rest({ key: ablyApiKey!, logLevel: 1 as any });
        } catch (error) {
            console.error('❌ [ABLY SERVER] Failed to reinitialize Ably client:', error);
            throw new Error('❌ [ABLY SERVER] Server Ably client not initialized - check ABLY_API_KEY and server configuration');
        }
    } else {
       throw new Error('❌ [ABLY SERVER] Server Ably client not initialized - check ABLY_API_KEY and server configuration');
    }
  }
  
  return ablyServer;
};

export default ablyServer;
