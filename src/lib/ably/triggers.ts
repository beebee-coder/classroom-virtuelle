// src/lib/ably/triggers.ts - VERSION CORRIGÉE
'use server';

/**
 * @fileoverview Server-side function to publish events to Ably channels.
 * This is the Ably equivalent of the previous `pusherTrigger` function.
 */

import { getServerAblyClient } from './server';
import type { AblyEventName } from './events';

interface AblyTriggerOptions {
  socket_id?: string;
}

/**
 * Helper function to publish with timeout
 */
async function publishWithTimeout<T>(
  channelName: string,
  eventName: AblyEventName,
  data: T,
  timeoutMs: number = 5000
): Promise<boolean> {
  const ablyServer = getServerAblyClient();
  if (!ablyServer) {
    console.error('❌ [ABLY PUBLISH] - Ably server client not available');
    return false;
  }

  try {
    const channel = ablyServer.channels.get(channelName);
    
    const publishPromise = channel.publish(eventName, data);
    
    // Ajouter un timeout pour éviter les blocages
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Publish timeout after ${timeoutMs}ms`)), timeoutMs);
    });

    await Promise.race([publishPromise, timeoutPromise]);
    console.log(`✅ [ABLY PUBLISH] - Event '${eventName}' published to '${channelName}'`);
    return true;
    
  } catch (error) {
    console.error(`❌ [ABLY PUBLISH] - Failed to publish to '${channelName}':`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      eventName,
      channelName
    });
    return false;
  }
}

/**
 * Publishes an event to one or more Ably channels.
 *
 * @param channel The channel name or an array of channel names to publish to.
 * @param eventName The name of the event to publish.
 * @param data The payload for the event.
 * @param options Optional parameters, like a socket_id to exclude a client.
 * @returns A promise that resolves to true on success, false on failure.
 */
export async function ablyTrigger<T>(
  channel: string | string[],
  eventName: AblyEventName,
  data: T,
  options?: AblyTriggerOptions
): Promise<boolean> {
  console.log(`📤 [ABLY TRIGGER] - Publishing event '${eventName}' to channel(s):`, channel);

  if (!channel || !eventName) {
    console.error('❌ [ABLY TRIGGER] - Channel or event name is missing.');
    return false;
  }

  // CORRECTION: Utilisation sécurisée du client serveur
  const ablyServer = getServerAblyClient();
  if (!ablyServer) {
    console.error('❌ [ABLY TRIGGER] - Ably server client not available');
    return false;
  }

  try {
    // Ably's publish method doesn't directly support excluding a socket_id in the same way Pusher did.
    // The exclusion happens on the client-side by default (echoMessages: false).
    // If specific server-side exclusion is needed, it must be handled differently,
    // but for this migration, client-side echo prevention is sufficient.
    const channels = Array.isArray(channel) ? channel : [channel];
    
    // CORRECTION: Utilisation de la fonction avec timeout pour chaque canal
    const publishPromises = channels.map(ch => 
      publishWithTimeout(ch, eventName, data)
    );

    const results = await Promise.all(publishPromises);
    const success = results.every(result => result === true);

    if (success) {
      console.log(`✅ [ABLY TRIGGER] - Event '${eventName}' published successfully to all channels.`);
    } else {
      console.error(`⚠️ [ABLY TRIGGER] - Event '${eventName}' partially failed. Success: ${results.filter(Boolean).length}/${results.length}`);
    }

    return success;

  } catch (error) {
    console.error(`🔴 [ABLY TRIGGER ERROR] - Failed to publish event '${eventName}':`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      channel,
      eventName,
    });
    return false;
  }
}

// CORRECTION: Fonction utilitaire pour les déclenchements batch optimisés
export async function ablyTriggerBatch<T>(
  channel: string | string[],
  events: Array<{ eventName: AblyEventName; data: T }>,
  options?: AblyTriggerOptions
): Promise<boolean> {
  console.log(`📦 [ABLY TRIGGER BATCH] - Publishing ${events.length} events to channel(s):`, channel);

  if (!channel || events.length === 0) {
    console.error('❌ [ABLY TRIGGER BATCH] - Channel or events are missing.');
    return false;
  }

  const ablyServer = getServerAblyClient();
  if (!ablyServer) {
    console.error('❌ [ABLY TRIGGER BATCH] - Ably server client not available');
    return false;
  }

  try {
    const channels = Array.isArray(channel) ? channel : [channel];
    
    // CORRECTION: Publication batch optimisée
    const allPublishPromises: Promise<boolean>[] = [];

    for (const ch of channels) {
      for (const event of events) {
        allPublishPromises.push(
          publishWithTimeout(ch, event.eventName, event.data)
        );
      }
    }

    const results = await Promise.all(allPublishPromises);
    const successCount = results.filter((result: boolean) => result === true).length;
    const totalCount = results.length;

    if (successCount === totalCount) {
      console.log(`✅ [ABLY TRIGGER BATCH] - All ${totalCount} events published successfully.`);
    } else {
      console.warn(`⚠️ [ABLY TRIGGER BATCH] - Partial success: ${successCount}/${totalCount} events published.`);
    }

    return successCount > 0; // Retourne true si au moins une publication a réussi

  } catch (error) {
    console.error(`🔴 [ABLY TRIGGER BATCH ERROR] - Failed batch publish:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      channel,
      eventCount: events.length,
    });
    return false;
  }
}

// CORRECTION: Fonction pour vérifier la disponibilité d'Ably
export async function checkAblyConnection(): Promise<boolean> {
  const ablyServer = getServerAblyClient();
  
  if (!ablyServer) {
    console.error('❌ [ABLY CONNECTION CHECK] - Ably server client not available');
    return false;
  }

  try {
    // Test de connexion simple
    await ablyServer.time();
    console.log('✅ [ABLY CONNECTION CHECK] - Ably connection is healthy');
    return true;
  } catch (error) {
    console.error('❌ [ABLY CONNECTION CHECK] - Ably connection test failed:', error);
    return false;
  }
}