// src/lib/redis-subscriber.ts
import Redis from 'ioredis';
import { pusherTrigger } from './pusher/server';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config({ path: '.env.local' });
dotenv.config(); // Pour .env

const redisUrl = process.env.REDIS_URL;
const isPusherConfigured = 
    process.env.PUSHER_APP_ID &&
    process.env.NEXT_PUBLIC_PUSHER_KEY &&
    process.env.PUSHER_SECRET;


if (!redisUrl) {
  console.error("❌ REDIS_URL n'est pas définie. Le service d'abonnement ne peut pas démarrer.");
  process.exit(1);
}

if (!isPusherConfigured) {
    console.warn("⚠️ [REDIS SUBSCRIBER] - Configuration Pusher manquante. Le script ne diffusera pas d'événements.");
}

const subscriber = new Redis(redisUrl);
const publisher = new Redis(redisUrl); // Client séparé pour les commandes SET

const WHITEBOARD_SNAPSHOT_KEY = (sessionId: string) => `whiteboard:${sessionId}:snapshot`;
const WHITEBOARD_CHANNEL_PATTERN = 'whiteboard-channel-*';
const WHITEBOARD_UPDATE_EVENT = 'whiteboard-update';


console.log('✅ [REDIS SUBSCRIBER] - Démarrage du service...');
console.log(`👂 Écoute du pattern de canal: ${WHITEBOARD_CHANNEL_PATTERN}`);

// S'abonner à un pattern de canaux
subscriber.psubscribe(WHITEBOARD_CHANNEL_PATTERN, (err, count) => {
  if (err) {
    console.error("❌ Échec de l'abonnement au pattern Redis:", err);
    process.exit(1);
  }
  console.log(`✅ Abonné avec succès à ${count} pattern(s).`);
});

// Écouter les messages
subscriber.on('pmessage', async (pattern, channel, message) => {
  console.log(`📬 Message reçu sur le canal [${channel}]`);
  
  const sessionId = channel.replace('whiteboard-channel-', '');
  
  try {
    // Sauvegarder le dernier snapshot dans une clé Redis normale
    const { snapshot, senderSocketId } = JSON.parse(message);
    await publisher.set(WHITEBOARD_SNAPSHOT_KEY(sessionId), JSON.stringify(snapshot));
    console.log(`  -> Snapshot sauvegardé pour la session ${sessionId}.`);

    // Déclencher l'événement Pusher vers les clients, seulement si Pusher est configuré
    if (isPusherConfigured) {
      const pusherChannelName = `presence-session-${sessionId}`;
      await pusherTrigger(
        pusherChannelName, 
        WHITEBOARD_UPDATE_EVENT, 
        { snapshot, senderId: senderSocketId }, // Inclure le senderId pour l'exclusion côté client
        { socket_id: senderSocketId }
      );
      console.log(`  -> 🎨 Diffusé sur Pusher [${pusherChannelName}].`);
    } else {
        console.log("  -> Pusher non configuré, diffusion ignorée.");
    }

  } catch (error) {
    console.error(`❌ Erreur lors du traitement du message du canal ${channel}:`, error);
  }
});

// Gérer les erreurs de connexion
subscriber.on('error', (err) => {
  console.error('❌ Erreur de connexion du client subscriber Redis:', err);
});

publisher.on('error', (err) => {
    console.error('❌ Erreur de connexion du client publisher Redis:', err);
});

console.log("🚀 [REDIS SUBSCRIBER] - Service prêt et en attente de messages.");
