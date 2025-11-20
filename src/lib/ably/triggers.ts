// src/lib/ably/triggers.ts
'use server';

import { getAblyChannel } from './server';
import type { AblyEventName } from './events';

interface AblyTriggerOptions {
  socket_id?: string;
}

/**
 * Publishes an event to one or more Ably channels.
 * ✅ CORRECTION : Fonction Server Action pure
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

  try {
    const channels = Array.isArray(channel) ? channel : [channel];
    const publishPromises = channels.map(async (chName) => {
      try {
        const channelInstance = await getAblyChannel(chName);
        await channelInstance.publish(eventName, data);
        console.log(`✅ [ABLY TRIGGER] - Event '${eventName}' published to ${chName}`);
        return true;
      } catch (error) {
        console.error(`❌ [ABLY TRIGGER] - Failed to publish to ${chName}:`, error);
        return false;
      }
    });

    const results = await Promise.all(publishPromises);
    const success = results.every(result => result === true);
    
    if (success) {
      console.log(`✅ [ABLY TRIGGER] - All events published successfully`);
    } else {
      console.warn(`⚠️ [ABLY TRIGGER] - Some events failed to publish`);
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
