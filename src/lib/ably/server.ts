// src/lib/ably/server.ts - VERSION FINALE CORRIGÉE
// CORRECTION: Utilisation de l'import conditionnel avec vérification stricte

let ablyServer: any = null;
let ablyInitialized = false;

declare global {
  // eslint-disable-next-line no-var
  var ablyServerInstance: any;
}

const ablyApiKey = process.env.ABLY_API_KEY;

// CORRECTION: Fonction d'initialisation isolée
const initializeAblyServer = async (): Promise<any> => {
  // Double vérification pour s'assurer que nous sommes côté serveur
  if (typeof window !== 'undefined') {
    return null;
  }

  if (ablyInitialized && ablyServer) {
    return ablyServer;
  }

  if (!ablyApiKey) {
    console.error('❌ [ABLY SERVER] ABLY_API_KEY is missing');
    return null;
  }

  try {
    // CORRECTION: Import dynamique avec gestion d'erreur
    const Ably = await import('ably')
      .then(module => module.default)
      .catch(error => {
        console.error('❌ [ABLY SERVER] Failed to load Ably module:', error);
        return null;
      });

    if (!Ably) {
      return null;
    }

    const clientOptions = {
      key: ablyApiKey,
      logLevel: process.env.NODE_ENV === 'development' ? 2 : 1,
      tls: true,
      httpMaxRetryCount: 3
    };

    ablyServer = global.ablyServerInstance || new Ably.Rest(clientOptions);

    if (process.env.NODE_ENV !== 'production') {
      global.ablyServerInstance = ablyServer;
    }

    ablyInitialized = true;
    console.log('✅ [ABLY SERVER] Ably server-side client initialized successfully.');
    return ablyServer;
  } catch (error) {
    console.error('❌ [ABLY SERVER] Failed to initialize Ably client:', error);
    return null;
  }
};

// CORRECTION: Export asynchrone uniquement
export const getServerAblyClient = async (): Promise<any> => {
  if (typeof window !== 'undefined') {
    throw new Error('❌ [ABLY SERVER] Cannot use server Ably client in browser context');
  }
  
  const client = await initializeAblyServer();
  if (!client) {
    throw new Error('❌ [ABLY SERVER] Server Ably client not initialized - check ABLY_API_KEY and server environment');
  }
  
  return client;
};

// CORRECTION: Pas d'export par défaut pour éviter les imports accidentels
// Les autres fichiers doivent utiliser getServerAblyClient()