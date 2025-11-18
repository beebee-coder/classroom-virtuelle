// src/lib/ably/client.ts
'use client';
import Ably, { type Types } from 'ably';

// Singleton pour partager l'instance client entre les composants
let globalClient: Ably.Realtime | null = null;
let refCount = 0;

export const getAblyClient = (): Ably.Realtime => {
    if (globalClient) {
        console.log('🔄 Reusing existing global Ably client instance.');
        refCount++;
        return globalClient;
    }

    const clientOptions: Types.ClientOptions = {
        authUrl: '/api/ably/auth',
        authMethod: 'POST',
        // Options pour améliorer la stabilité
        disconnectedRetryTimeout: 15000,
        suspendedRetryTimeout: 30000,
        echoMessages: false,
        queueMessages: true,
        closeOnUnload: true,
    };
    
    console.log('✅ Creating new global Ably Realtime client instance.');
    const ablyClient = new Ably.Realtime(clientOptions);
    
    ablyClient.connection.on((stateChange) => {
        console.log(`🔌 Ably Connection State: ${stateChange.previous} -> ${stateChange.current}`);
        if(stateChange.reason) {
          console.error('Ably connection error reason:', stateChange.reason);
        }
    });

    globalClient = ablyClient;
    refCount = 1;
    return ablyClient;
};

export const closeAblyClient = (): void => {
    refCount--;
    if (refCount <= 0 && globalClient) {
        console.log('🚪 Closing global Ably client instance.');
        globalClient.close();
        globalClient = null;
        refCount = 0;
    }
};

