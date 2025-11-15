// src/lib/ably/server.ts - VERSION CORRIGÉE
import Ably from 'ably';

declare global {
  // eslint-disable-next-line no-var
  var ablyServerInstance: Ably.Rest | undefined;
}

const ablyApiKey = process.env.ABLY_API_KEY;

// CORRECTION: Initialisation robuste avec valeur par défaut sécurisée
let ablyServer: Ably.Rest | null = null;

if (typeof window === 'undefined' && ablyApiKey) {
  try {
    // CORRECTION: Configuration simplifiée
    const clientOptions: Ably.Types.ClientOptions = {
      key: ablyApiKey,
      logLevel: process.env.NODE_ENV === 'development' ? 2 : 1 as any,
      tls: true,
      httpMaxRetryCount: 3
    };

    // Singleton pattern
    ablyServer = global.ablyServerInstance || new Ably.Rest(clientOptions);

    if (process.env.NODE_ENV !== 'production') {
      global.ablyServerInstance = ablyServer;
    }

    console.log('✅ [ABLY SERVER] Ably server-side client initialized.');
  } catch (error) {
    console.error('❌ [ABLY SERVER] Failed to initialize Ably client:', error);
    // CORRECTION: Ne pas throw pour éviter de casser l'application
    ablyServer = null;
  }
} else if (typeof window !== 'undefined') {
  console.warn('⚠️ [ABLY SERVER] Attempted to use server-side Ably client in browser context');
} else if (!ablyApiKey) {
  console.error('❌ [ABLY SERVER] ABLY_API_KEY is missing');
}

// CORRECTION: Export sécurisé avec fonction helper
export default ablyServer;

// CORRECTION: Fonction utilitaire pour un accès sécurisé
export const getServerAblyClient = (): Ably.Rest => {
  if (typeof window !== 'undefined') {
    throw new Error('❌ [ABLY SERVER] Cannot use server Ably client in browser context');
  }
  
  if (!ablyServer) {
    throw new Error('❌ [ABLY SERVER] Server Ably client not initialized');
  }
  
  return ablyServer;
};