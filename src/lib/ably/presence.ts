// src/lib/ably/presence.ts - VERSION CORRIGÉE TEMPORAIRE
import Ably from 'ably';
import type { AblyPresenceMember } from './types';
import { getServerAblyClient } from './server';
import { Types } from 'ably';

/**
 * Retrieves the list of presence members for a given channel.
 * This function must be called from the server-side.
 * 
 * @param channelName The name of the channel to query.
 * @returns A promise that resolves to an array of presence members.
 * @throws Will throw an error if the Ably API call fails.
 */
export async function getPresenceMembers(channelName: string): Promise<AblyPresenceMember[]> {
    console.log(`[ABLY PRESENCE] - Fetching members for channel: ${channelName}`);
    
    if (!channelName) {
        console.error('[ABLY PRESENCE] - Channel name is required.');
        throw new Error('Channel name is required.');
    }

    try {
        const ablyServer = getServerAblyClient();
        const channel = ablyServer.channels.get(channelName);
        
        const presenceMembers = await channel.presence.get();
        
        if (!Array.isArray(presenceMembers)) {
            console.warn('[ABLY PRESENCE] - Presence.get() did not return an array:', presenceMembers);
            return [];
        }

        const members = presenceMembers.map((member: Ably.Types.PresenceMessage) => {
            // CORRECTION: Typage sécurisé avec assertions de type
            const memberData = member.data as any;
            
            return {
                id: member.clientId || 'unknown',
                name: memberData?.name || 'Unknown User',
                role: memberData?.role || 'UNKNOWN',
                image: memberData?.image || null,
                // CORRECTION: timestamp optionnel avec valeur par défaut
                ...(memberData?.timestamp && { timestamp: memberData.timestamp })
            } as AblyPresenceMember; // CORRECTION: Assertion de type
        });

        console.log(`[ABLY PRESENCE] - Found ${members.length} members on ${channelName}.`);
        return members;

    } catch (error) {
        console.error(`[ABLY PRESENCE] - Failed to get presence members for ${channelName}:`, error);
        
        if (error instanceof Error && error.message.includes('browser context')) {
            throw new Error('getPresenceMembers can only be called server-side');
        }
        
        throw new Error(`Could not fetch presence members from Ably: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}