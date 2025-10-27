// src/lib/redis.ts
import Redis from 'ioredis';

// Assurez-vous que votre variable d'environnement REDIS_URL est définie.
if (!process.env.REDIS_URL) {
    console.warn("⚠️ Avertissement : La variable d'environnement REDIS_URL n'est pas définie. Redis ne sera pas utilisé.");
}

// Configuration de la stratégie de reconnexion
const retryStrategy = (times: number): number | null => {
    // Si nous avons déjà essayé 3 fois, on abandonne.
    if (times > 3) {
      console.error("❌ Redis: Nombre maximum de tentatives de reconnexion atteint. Abandon de la connexion.");
      return null;
    }
    // Délai exponentiel : 500ms, 1000ms, 2000ms
    const delay = Math.min(times * 500, 2000);
    console.log(`🔌 Redis: Tentative de reconnexion n°${times}. Prochaine tentative dans ${delay}ms.`);
    return delay;
};


// Crée un client Redis. L'option `lazyConnect` empêche la connexion immédiate.
const redis = process.env.REDIS_URL 
    ? new Redis(process.env.REDIS_URL, { 
        lazyConnect: true,
        retryStrategy: retryStrategy, // Appliquer la nouvelle stratégie
        maxRetriesPerRequest: 1, // Éviter qu'une seule commande soit réessayée indéfiniment
      }) 
    : null;

// Gérer les erreurs de connexion de manière asynchrone pour ne pas bloquer le serveur
if (redis) {
    redis.on('error', (err) => {
        // Le logging est déjà géré par retryStrategy, on évite le bruit.
        // On peut logguer une fois si nécessaire :
        // console.error('❌ Erreur de connexion Redis:', err.message);
    });

    redis.on('connect', () => {
        console.log('✅ Connecté à Redis avec succès.');
    });
}

export default redis;
