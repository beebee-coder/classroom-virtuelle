// src/lib/ably/http-trigger.ts
'use client';

/**
 * @fileoverview Client-side helper to trigger Ably events via an HTTP API route.
 * This replaces the need for server-side imports of Ably in Server Actions used by client components.
 */

interface TriggerOptions {
  socket_id?: string;
}

/**
 * Triggers an Ably event by sending a request to a dedicated API route.
 *
 * @param channel The channel name or an array of channel names.
 * @param eventName The name of the event.
 * @param data The payload for the event.
 * @returns A promise that resolves to true on success, false on failure.
 */
export async function httpAblyTrigger<T>(
  channel: string | string[],
  eventName: string,
  data: T
): Promise<boolean> {
  try {
    const response = await fetch('/api/ably/trigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel,
        eventName,
        data,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [HTTP TRIGGER] - API Error (${response.status}): ${errorText}`);
      return false;
    }

    console.log(`✅ [HTTP TRIGGER] - Event '${eventName}' successfully sent to API for channel(s):`, channel);
    return true;

  } catch (error) {
    console.error(`❌ [HTTP TRIGGER] - Network or fetch error for event '${eventName}':`, error);
    return false;
  }
}