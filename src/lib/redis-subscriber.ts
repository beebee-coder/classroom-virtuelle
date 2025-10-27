// src/lib/redis-subscriber.ts
import Redis from 'ioredis';
import { pusherTrigger } from './pusher/server';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config({ path: '.env.local' });
dotenv.config(); // Pour .env

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.error("❌ REDIS_URL n'est pas définie. Le service d'abonnement ne peut pas démarrer.");
  process.exit(1);
}

const subscriber = new Redis(redisUrl);
const publisher = new Redis(redisUrl); // Client séparé pour les commandes SET

const WHITEBOARD_SNAPSHOT_KEY = (sessionId: string) => `whiteboard:${sessionId}:snapshot`;
const WHITEBOARD_CHANNEL_PATTERN = 'whiteboard-channel-*';
const WHITEBOARD_UPDATE_EVENT = 'whiteboard-update-event';


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
  const pusherChannelName = `presence-session-${sessionId}`;

  try {
    const { snapshot, senderSocketId } = JSON.parse(message);

    // Déclencher l'événement Pusher vers les clients, en excluant l'expéditeur
    await pusherTrigger(
      pusherChannelName, 
      WHITEBOARD_UPDATE_EVENT, 
      { snapshot }, 
      { socket_id: senderSocketId }
    );
    
    // Sauvegarder le dernier snapshot dans une clé Redis normale
    await publisher.set(WHITEBOARD_SNAPSHOT_KEY(sessionId), JSON.stringify(snapshot));

    console.log(`  -> 🎨 Diffusé sur Pusher [${pusherChannelName}] et snapshot sauvegardé.`);

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
