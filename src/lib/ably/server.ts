// src/lib/ably/server.ts - VERSION CORRIGÉE POUR VERCEL (SANS ERREURS TYPESCRIPT)
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
  
  if (!key.startsWith('') && key.split('.').length !== 2) {
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
        // ✅ CORRECTION : Utilisation correcte de logLevel avec le bon type
        logLevel: (process.env.NODE_ENV === 'development' ? 2 : 1) as any, // ✅ FIX: Type assertion
        tls: true,
        httpMaxRetryCount: 5, // ✅ AUGMENTÉ : Plus de tentatives pour Vercel
        httpOpenTimeout: 15000, // ✅ AJOUTÉ : Timeout étendu pour cold starts
        httpRequestTimeout: 30000, // ✅ AJOUTÉ : Timeout long pour Vercel
        fallbackHosts: ['a.ably-realtime.com', 'b.ably-realtime.com', 'c.ably-realtime.com'], // ✅ AJOUTÉ : Résilience
        idempotentRestPublishing: true, // ✅ AJOUTÉ : Éviter les doublons
        
        // ✅ CORRECTION : Paramètres de récupération améliorés
        disconnectedRetryTimeout: 5000,
        suspendedRetryTimeout: 10000,
        
        // ✅ CORRECTION SUPPRIMÉE : 'headers' retiré car non supporté dans ClientOptions
      };

      // ✅ CORRECTION : Singleton pattern avec vérification d'état
      if (global.ablyServerInstance) {
        ablyServer = global.ablyServerInstance;
        console.log('🔄 [ABLY SERVER] Reusing existing global Ably server instance');
      } else {
        ablyServer = new Ably.Rest(clientOptions);
        
        // ✅ CORRECTION : Vérification de la connexion serveur (sans .then() sur void)
        // La méthode time() de Rest ne retourne pas de Promise, donc on l'appelle simplement
        try {
          ablyServer.time((error, timestamp) => {
            if (error) {
              console.error('❌ [ABLY SERVER] Ably server connection test failed:', error);
            } else {
              console.log('✅ [ABLY SERVER] Ably server-side client initialized and connected successfully');
              console.log(`🕒 [ABLY SERVER] Server time: ${timestamp}`);
            }
          });
        } catch (error) {
          console.error('❌ [ABLY SERVER] Error during Ably server initialization test:', error);
        }

        if (process.env.NODE_ENV !== 'production') {
          global.ablyServerInstance = ablyServer;
        }
      }

    } catch (error: any) { // ✅ CORRECTION : Type explicit pour error
      console.error('❌ [ABLY SERVER] Critical error initializing Ably client:', error);
      
      // ✅ CORRECTION : Gestion d'erreur spécifique pour Vercel
      if (error.message.includes('Invalid key')) {
        console.error('🔑 [ABLY SERVER] ABLY_API_KEY is invalid - check environment variables');
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        console.warn('🌐 [ABLY SERVER] Network issue during initialization - common on Vercel cold starts');
      }
      
      ablyServer = null;
    }
  } else {
    console.error('❌ [ABLY SERVER] Ably API key validation failed');
  }
} else {
  console.warn('⚠️ [ABLY SERVER] Attempted to use server-side Ably client in browser context');
}

// ✅ CORRECTION : Export sécurisé avec fonction helper améliorée
export default ablyServer;

// ✅ CORRECTION : Fonction utilitaire pour un accès sécurisé avec gestion d'erreur
export const getServerAblyClient = (): Ably.Rest => {
  if (typeof window !== 'undefined') {
    throw new Error('❌ [ABLY SERVER] Cannot use server Ably client in browser context');
  }
  
  if (!ablyServer) {
    // ✅ CORRECTION : Tentative de réinitialisation si possible
    if (validateAblyApiKey(ablyApiKey)) {
      console.log('🔄 [ABLY SERVER] Attempting to reinitialize server client...');
      try {
        ablyServer = new Ably.Rest({ 
          key: ablyApiKey!,
          logLevel: 1 as any // ✅ CORRECTION : Type assertion
        });
      } catch (error) {
        console.error('❌ [ABLY SERVER] Failed to reinitialize Ably client:', error);
      }
    }
    
    if (!ablyServer) {
      throw new Error('❌ [ABLY SERVER] Server Ably client not initialized - check ABLY_API_KEY and server configuration');
    }
  }
  
  return ablyServer;
};

// ✅ NOUVELLE FONCTION : Vérification de santé du serveur Ably (version corrigée)
export const checkServerAblyHealth = async (): Promise<{
  isHealthy: boolean;
  status: string;
  timestamp?: number;
  error?: string;
}> => {
  try {
    if (typeof window !== 'undefined') {
      return { isHealthy: false, status: 'browser_context' };
    }
    
    if (!ablyServer) {
      return { isHealthy: false, status: 'not_initialized' };
    }
    
    // ✅ CORRECTION : Utilisation correcte de la méthode time() avec callback
    return new Promise((resolve) => {
      ablyServer!.time((error, timestamp) => {
        if (error) {
          console.error('❌ [ABLY SERVER] Health check failed:', error);
          resolve({
            isHealthy: false,
            status: 'error',
            error: error.message
          });
        } else {
          resolve({
            isHealthy: true,
            status: 'connected',
            timestamp: timestamp || Date.now() // ✅ CORRECTION : Fallback si timestamp est undefined
          });
        }
      });
    });
  } catch (error: any) { // ✅ CORRECTION : Type explicit pour error
    console.error('❌ [ABLY SERVER] Health check failed:', error);
    return {
      isHealthy: false,
      status: 'error',
      error: error.message || 'Unknown error'
    };
  }
};

// ✅ NOUVELLE FONCTION : Publication sécurisée avec gestion d'erreur
export const safePublish = async (
  channelName: string,
  eventName: string,
  data: any
): Promise<{ success: boolean; error?: string }> => {
  try {
    const client = getServerAblyClient();
    const channel = client.channels.get(channelName);
    
    await channel.publish(eventName, data);
    
    console.log(`✅ [ABLY SERVER] Event '${eventName}' published to '${channelName}'`);
    return { success: true };
  } catch (error: any) { // ✅ CORRECTION : Type explicit pour error
    console.error(`❌ [ABLY SERVER] Failed to publish event '${eventName}' to '${channelName}':`, error);
    
    // ✅ CORRECTION : Gestion d'erreur spécifique pour Vercel
    let errorMessage = 'Unknown error';
    if (error.message) {
      errorMessage = error.message;
      
      // Gestion des erreurs réseau spécifiques à Vercel
      if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
        console.warn('🌐 [ABLY SERVER] Network error during publish - common in Vercel environment');
      }
    }
    
    return { 
      success: false, 
      error: errorMessage 
    };
  }
};

// ✅ NOUVELLE FONCTION : Réinitialisation pour les rechargements Vercel
export const resetServerAblyClient = (): void => {
  if (typeof window === 'undefined') {
    console.log('🔄 [ABLY SERVER] Resetting server Ably client instance');
    ablyServer = null;
    global.ablyServerInstance = undefined;
  }
};

// ✅ NOUVELLE FONCTION : Récupération après erreur 80003
export const recoverFromServerError = async (): Promise<boolean> => {
  if (typeof window !== 'undefined') {
    return false;
  }
  
  try {
    resetServerAblyClient();
    
    if (validateAblyApiKey(ablyApiKey)) {
      ablyServer = new Ably.Rest({ 
        key: ablyApiKey!,
        logLevel: 1 as any, // ✅ CORRECTION : Type assertion
        httpMaxRetryCount: 3
      });
      
      // ✅ CORRECTION : Tester la nouvelle instance avec callback
      return new Promise((resolve) => {
        ablyServer!.time((error) => {
          if (error) {
            console.error('❌ [ABLY SERVER] Recovery from server error failed:', error);
            resolve(false);
          } else {
            console.log('✅ [ABLY SERVER] Successfully recovered from server error');
            resolve(true);
          }
        });
      });
    }
  } catch (error: any) { // ✅ CORRECTION : Type explicit pour error
    console.error('❌ [ABLY SERVER] Recovery from server error failed:', error);
  }
  
  return false;
};