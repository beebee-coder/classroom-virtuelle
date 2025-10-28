
//src/lib/redis.ts
import Redis from 'ioredis';

let redisClient: Redis | null = null;

// Fonction pour obtenir le client Redis
export async function getClient(): Promise<Redis | null> {
  // Si le client est déjà initialisé, le retourner
  if (redisClient) {
    return redisClient;
  }

  // Si REDIS_URL n'est pas définie, retourner null
  if (!process.env.REDIS_URL) {
    console.warn('⚠️ REDIS_URL non définie, Redis désactivé');
    return null;
  }

  try {
    // Initialiser le client Redis
    redisClient = new Redis(process.env.REDIS_URL, {
      retryStrategy: (times: number) => {
        if (times > 3) return null;
        const delay = Math.min(times * 500, 2000);
        console.log(`🔌 Redis reconnexion n°${times} dans ${delay}ms`);
        return delay;
      },
      maxRetriesPerRequest: 1,
    });

    // Gestion des événements
    redisClient.on('error', (err: Error) => {
      console.error('❌ Erreur Redis:', err.message);
    });

    redisClient.on('connect', () => {
      console.log('✅ Connecté à Redis avec succès');
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis prêt à recevoir des commandes');
    });

    return redisClient;
  } catch (error) {
    console.error('❌ Échec de l initialisation Redis:', error);
    redisClient = null;
    return null;
  }
}

// Export par défaut pour la compatibilité
export default getClient;