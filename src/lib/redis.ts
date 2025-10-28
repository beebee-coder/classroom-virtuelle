// src/lib/redis.ts
import Redis from 'ioredis';

declare global {
  // eslint-disable-next-line no-var
  var redis: Redis | undefined;
}

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
    console.warn("⚠️ Avertissement : La variable d'environnement REDIS_URL n'est pas définie. Redis ne sera pas utilisé.");
}

const retryStrategy = (times: number): number | null => {
    if (times > 3) {
      console.error("❌ Redis: Nombre maximum de tentatives de reconnexion atteint. Abandon de la connexion.");
      return null;
    }
    const delay = Math.min(times * 500, 2000);
    console.log(`🔌 Redis: Tentative de reconnexion n°${times}. Prochaine tentative dans ${delay}ms.`);
    return delay;
};

// Fonction pour obtenir une instance de client Redis connectée
async function getClient(): Promise<Redis | null> {
    if (!redisUrl) {
        return null;
    }
    
    // Si l'instance n'existe pas, la créer
    if (!global.redis) {
        console.log('🔗 [REDIS] Création d\'une nouvelle connexion...');
        global.redis = new Redis(redisUrl, {
            retryStrategy,
            maxRetriesPerRequest: 1,
        });

        global.redis.on('error', (err: Error) => {
            console.error('❌ Erreur Redis:', err.message);
        });

        global.redis.on('connect', () => {
            console.log('✅ Connecté à Redis avec succès.');
        });
    }

    // Si la connexion n'est pas encore prête, attendre qu'elle le soit
    if (global.redis.status !== 'ready' && global.redis.status !== 'connect') {
        console.log(`⏳ [REDIS] Connexion non prête (statut: ${global.redis.status}). En attente...`);
        try {
            await global.redis.connect();
        } catch (error) {
            console.error('❌ [REDIS] Échec de la connexion manuelle:', error);
            // Si la connexion échoue, détruire l'instance pour forcer une nouvelle tentative au prochain appel.
            if (global.redis) {
                global.redis.disconnect();
                global.redis = undefined;
            }
            return null;
        }
    }
    
    return global.redis;
}

export default getClient;
