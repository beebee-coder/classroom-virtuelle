
//src/lib/redis.ts
import Redis from 'ioredis';

// Fonction modifiée pour désactiver Redis
export async function getClient(): Promise<Redis | null> {
  // Nous retournons systématiquement null pour désactiver Redis dans toute l'application.
  // Cela évite les erreurs de connexion si REDIS_URL n'est pas configuré.
  if (process.env.REDIS_URL) {
      console.warn('⚠️ REDIS_URL est définie mais l\'intégration Redis est désactivée dans src/lib/redis.ts.');
  }
  return null;
}

// Export par défaut pour la compatibilité
export default getClient;
