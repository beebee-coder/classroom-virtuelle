// src/lib/ably/triggers.ts
'use server';

import { getServerAblyClient } from './server';
import type { AblyEventName } from './events';

interface AblyTriggerOptions {
  socket_id?: string;
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

  let ablyServer;
  try {
    ablyServer = getServerAblyClient();
  } catch (error) {
    console.error('❌ [ABLY TRIGGER] - Ably server client not available:', error);
    return false;
  }

  try {
    const channels = Array.isArray(channel) ? channel : [channel];
    const publishPromises = channels.map(chName => {
      const ch = ablyServer.channels.get(chName);
      return ch.publish(eventName, data);
    });

    await Promise.all(publishPromises);
    console.log(`✅ [ABLY TRIGGER] - Event '${eventName}' published successfully.`);
    return true;

  } catch (error) {
    console.error(`🔴 [ABLY TRIGGER ERROR] - Failed to publish event '${eventName}':`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      channel,
      eventName,
    });
    return false;
  }
}
