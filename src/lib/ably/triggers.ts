// src/lib/ably/triggers.ts
'use server';

/**
 * @fileoverview Server-side function to publish events to Ably channels.
 * This should only be used in Server Components or Server Actions that are NOT
 * called directly from client components. For client-side triggers, use the
 * /api/ably/trigger route via the `httpAblyTrigger` helper.
 */

import { getServerAblyClient } from './server';
import type { AblyEventName } from './events';

/**
 * Publishes an event to one or more Ably channels.
 * This is for server-to-server or server-to-client communication initiated from the backend.
 *
 * @param channel The channel name or an array of channel names to publish to.
 * @param eventName The name of the event to publish.
 * @param data The payload for the event.
 * @returns A promise that resolves to true on success, false on failure.
 */
export async function ablyTrigger<T>(
  channel: string | string[],
  eventName: AblyEventName,
  data: T
): Promise<boolean> {
  console.log(`📤 [SERVER TRIGGER] - Publishing event '${eventName}' to channel(s):`, channel);

  if (!channel || !eventName) {
    console.error('❌ [SERVER TRIGGER] - Channel or event name is missing.');
    return false;
  }

  let ablyServer;
  try {
    ablyServer = await getServerAblyClient();
    if (!ablyServer) {
        throw new Error("Ably server client could not be initialized.");
    }
  } catch (error) {
    console.error('❌ [SERVER TRIGGER] - Ably server client not available:', error);
    return false;
  }

  try {
    const channels = Array.isArray(channel) ? channel : [channel];
    
    const publishPromises = channels.map(ch => 
      ablyServer.channels.get(ch).publish(eventName, data)
    );

    await Promise.all(publishPromises);

    console.log(`✅ [SERVER TRIGGER] - Event '${eventName}' published successfully to all channels.`);
    return true;

  } catch (error) {
    console.error(`🔴 [SERVER TRIGGER ERROR] - Failed to publish event '${eventName}':`, error);
    return false;
  }
}