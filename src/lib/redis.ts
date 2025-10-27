// src/lib/redis.ts
import Redis from 'ioredis';

// Assurez-vous que votre variable d'environnement REDIS_URL est définie.
// Exemple: REDIS_URL="redis://localhost:6379"
// Ou pour Redis Cloud/Upstash: REDIS_URL="rediss://..."
if (!process.env.REDIS_URL) {
    console.warn("⚠️ Avertissement : La variable d'environnement REDIS_URL n'est pas définie. Redis ne sera pas utilisé.");
}

// Crée un client Redis. L'option `lazyConnect` empêche la connexion immédiate.
// L'option `maxRetriesPerRequest` est mise à 0 pour éviter des erreurs si Redis n'est pas disponible dans un environnement serverless.
const redis = process.env.REDIS_URL 
    ? new Redis(process.env.REDIS_URL, { 
        lazyConnect: true,
        maxRetriesPerRequest: 0 // Ne pas réessayer indéfiniment si la connexion échoue
      }) 
    : null;

// Gérer les erreurs de connexion de manière asynchrone pour ne pas bloquer le serveur
if (redis) {
    redis.on('error', (err) => {
        console.error('❌ Erreur de connexion Redis:', err.message);
    });

    redis.on('connect', () => {
        console.log('✅ Connecté à Redis avec succès.');
    });
}

export default redis;
