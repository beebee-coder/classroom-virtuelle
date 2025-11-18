// src/lib/ably/server.ts

// 'use server' directive is not needed here as this file is intended for server-side usage only.

// This file is intentionally structured to be incompatible with client-side bundling.
import Ably from 'ably';

// This ensures a single instance of the Ably client is created per server/lambda instance.
declare global {
  // eslint-disable-next-line no-var
  var ablyServerInstance: Ably.Rest | undefined;
}

let ablyServer: Ably.Rest;
const ablyApiKey = process.env.ABLY_API_KEY;

if (!ablyApiKey) {
  console.error("❌ ABLY_API_KEY is not set. Ably server-side functionality will not work.");
  // We don't throw an error here to allow the app to build, but functions will fail.
}

if (process.env.NODE_ENV === 'production') {
  if (!ablyApiKey) {
    // In production, we create a placeholder to avoid hard crashes if the key is missing.
    ablyServer = {
      channels: {
        get: () => ({
          publish: () => Promise.reject(new Error("Ably API key is missing.")),
        }),
      },
    } as any;
  } else {
    ablyServer = new Ably.Rest({ key: ablyApiKey });
  }
} else {
  if (!global.ablyServerInstance) {
    if (!ablyApiKey) {
      console.error("❌ ABLY_API_KEY is missing for development.");
      global.ablyServerInstance = {
        channels: {
          get: () => ({
            publish: () => Promise.reject(new Error("Ably API key is missing.")),
          }),
        },
      } as any;
    } else {
      global.ablyServerInstance = new Ably.Rest({ key: ablyApiKey });
      console.log('✅ Ably server client initialized for development.');
    }
  }
  ablyServer = global.ablyServerInstance;
}

/**
 * Returns the singleton server-side Ably REST client.
 * Throws an error if the ABLY_API_KEY is not configured.
 */
export function getServerAblyClient(): Ably.Rest {
  if (!ablyApiKey) {
    throw new Error("Ably server client cannot be used without an ABLY_API_KEY.");
  }
  return ablyServer;
}
