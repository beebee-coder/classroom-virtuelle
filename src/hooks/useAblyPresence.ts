// src/hooks/useAblyPresence.ts - CORRECTION DES TYPES ABLY
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAblyWithSession } from './useAblyWithSession';
import type { AblyPresenceMember } from '@/lib/ably/types';
import { getClassChannelName } from '@/lib/ably/channels';
import Ably from 'ably';

// CORRECTION: Alias de types pour plus de clarté
type AblyChannel = Ably.Types.RealtimeChannelCallbacks;
type AblyChannelStateChange = Ably.Types.ChannelStateChange;
type AblyPresenceMessage = Ably.Types.PresenceMessage;
type AblyErrorInfo = Ably.Types.ErrorInfo;

interface UseAblyPresenceReturn {
  onlineMembers: AblyPresenceMember[];
  isConnected: boolean;
  error: AblyErrorInfo | null;
  isLoading: boolean;
  enterPresence: (userData: Omit<AblyPresenceMember, 'id'>) => Promise<void>;
  leavePresence: () => Promise<void>;
  updatePresence: (userData: Omit<AblyPresenceMember, 'id'>) => Promise<void>;
}

// CORRECTION: Variables globales simplifiées pour la gestion des canaux
declare global {
  var activePresenceChannels: Map<string, { 
    refCount: number; 
    channel: AblyChannel;
    members: Map<string, AblyPresenceMember>;
  }>;
}

if (typeof globalThis.activePresenceChannels === 'undefined') {
  globalThis.activePresenceChannels = new Map();
}

export const useAblyPresence = (channelId?: string, enabled: boolean = true): UseAblyPresenceReturn => {
  const { client, connectionError, isLoading: ablyLoading } = useAblyWithSession();
  const [onlineMembers, setOnlineMembers] = useState<AblyPresenceMember[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AblyErrorInfo | null>(null);

  // CORRECTION: Références simplifiées et stabilisées
  const channelRef = useRef<AblyChannel | null>(null);
  const isEnteringRef = useRef(false);
  const mountedRef = useRef(true);
  const currentChannelNameRef = useRef<string | null>(null);
  const componentIdRef = useRef(`presence_${Math.random().toString(36).substring(2, 8)}`);

  // CORRECTION: Mise à jour des membres depuis la source globale
  const updateOnlineMembers = useCallback(() => {
    if (!mountedRef.current) return;
    
    const channelName = currentChannelNameRef.current;
    if (!channelName) return;

    const channelInfo = globalThis.activePresenceChannels.get(channelName);
    if (channelInfo) {
      const membersArray = Array.from(channelInfo.members.values());
      console.log(`📊 [useAblyPresence] - ${membersArray.length} members after update (${componentIdRef.current})`);
      setOnlineMembers(membersArray);
    } else {
      setOnlineMembers([]);
    }
  }, []);

  // CORRECTION: Gestion robuste des canaux globaux
  const manageChannelRefCount = useCallback((channelName: string, increment: boolean) => {
    if (!mountedRef.current) return;

    let channelInfo = globalThis.activePresenceChannels.get(channelName);
    
    if (increment) {
      if (channelInfo) {
        channelInfo.refCount++;
      } else {
        // Ce cas ne devrait pas arriver - le canal devrait déjà être créé
        console.warn(`⚠️ [useAblyPresence] - Channel ${channelName} not found in global cache during increment`);
        return;
      }
      console.log(`📈 [useAblyPresence] - Ref count for channel ${channelName} increased to: ${channelInfo.refCount} (${componentIdRef.current})`);
    } else {
      if (channelInfo) {
        channelInfo.refCount = Math.max(0, channelInfo.refCount - 1);
        console.log(`📉 [useAblyPresence] - Ref count for channel ${channelName} decreased to: ${channelInfo.refCount} (${componentIdRef.current})`);
        
        // CORRECTION: Ne détacher le canal que si plus aucun composant ne l'utilise
        if (channelInfo.refCount === 0) {
          console.log(`🔒 [useAblyPresence] - No active components for channel ${channelName}, scheduling cleanup`);
          setTimeout(() => {
            const currentChannelInfo = globalThis.activePresenceChannels.get(channelName);
            if (currentChannelInfo && currentChannelInfo.refCount === 0) {
              console.log(`🚪 [useAblyPresence] - Detaching channel ${channelName}`);
              currentChannelInfo.channel.detach();
              globalThis.activePresenceChannels.delete(channelName);
              console.log(`✅ [useAblyPresence] - Removed channel ${channelName}. Total channels: ${globalThis.activePresenceChannels.size}`);
            }
          }, 3000); // Délai de sécurité augmenté
        }
      }
    }
  }, []);

  // CORRECTION: Gestionnaire de présence unifié et stable
  const setupPresenceHandlers = useCallback((channel: AblyChannel, channelName: string) => {
    if (!mountedRef.current) return;

    let channelInfo = globalThis.activePresenceChannels.get(channelName);
    if (!channelInfo) {
      console.error(`❌ [useAblyPresence] - No channel info found for ${channelName}`);
      return;
    }

    // CORRECTION: Gestionnaire d'état de canal simplifié
    const stateHandler = (stateChange: AblyChannelStateChange) => {
      if (!mountedRef.current) return;
      
      console.log(`🔌 [useAblyPresence] - Channel state: ${stateChange.previous} → ${stateChange.current} for ${channelName} (${componentIdRef.current})`);
      
      if (stateChange.current === 'attached') {
        console.log(`✅ [useAblyPresence] - Attached to channel: ${channelName}`);
        setIsConnected(true);
        setError(null);
        setIsLoading(false);
      } else if (stateChange.current === 'detached') {
        console.warn(`⚠️ [useAblyPresence] - Detached from channel: ${channelName}`);
        setIsConnected(false);
      } else if (stateChange.current === 'failed') {
        console.error(`❌ [useAblyPresence] - Channel failed: ${channelName}`, stateChange.reason);
        if (stateChange.reason) {
          setError(stateChange.reason);
        }
        setIsConnected(false);
        setIsLoading(false);
      } else if (stateChange.current === 'suspended') {
        console.warn(`⏸️ [useAblyPresence] - Channel suspended: ${channelName}`);
        setIsConnected(false);
      }
    };

    // CORRECTION: Gestionnaire de présence avec état global cohérent
    const onPresenceUpdate = (message: AblyPresenceMessage) => {
      if (!mountedRef.current) return;

      console.log(`🔄 [useAblyPresence] - Presence update on ${channelName}`, {
        action: message.action,
        clientId: message.clientId,
        data: message.data
      });

      const currentMembers = channelInfo.members;

      // CORRECTION: Traitement cohérent avec mise à jour globale
      switch (message.action) {
        case 'present':
        case 'enter':
          if (message.clientId && message.data) {
            currentMembers.set(message.clientId, {
              id: message.clientId,
              ...(message.data as Omit<AblyPresenceMember, 'id'>)
            });
          }
          break;
          
        case 'leave':
        case 'absent':
          if (message.clientId) {
            currentMembers.delete(message.clientId);
          }
          break;
          
        case 'update':
          if (message.clientId && message.data) {
            currentMembers.set(message.clientId, {
              id: message.clientId,
              ...(message.data as Omit<AblyPresenceMember, 'id'>)
            });
          }
          break;
          
        default:
          console.warn(`⚠️ [useAblyPresence] - Unknown presence action: ${message.action}`);
      }
      
      updateOnlineMembers();
    };

    // CORRECTION: S'abonner aux événements
    channel.on(stateHandler);
    channel.presence.subscribe(onPresenceUpdate);

    // CORRECTION: Récupérer l'état de présence actuel - VERSION SIMPLIFIÉE
    try {
      // CORRECTION: Utiliser la méthode get sans callback pour éviter les erreurs de type
      channel.presence.get((err, members) => {
        if (!mountedRef.current) return;
        
        if (err) {
          console.error('❌ [useAblyPresence] - Error getting presence state:', err);
          return;
        }
        
        if (members) {
          console.log(`🔍 [useAblyPresence] - Retrieved ${members.length} current presence members`);
          channelInfo.members.clear();
          
          members.forEach((member: AblyPresenceMessage) => {
            if (member.clientId && member.data) {
              channelInfo.members.set(member.clientId, {
                id: member.clientId,
                ...(member.data as Omit<AblyPresenceMember, 'id'>)
              });
            }
          });
          
          updateOnlineMembers();
        }
      });
    } catch (err) {
      if (mountedRef.current) {
        console.error('❌ [useAblyPresence] - Error getting presence state:', err);
      }
    }

    return { stateHandler, onPresenceUpdate };
  }, [updateOnlineMembers]);

  // CORRECTION: Effet principal simplifié et stabilisé
  useEffect(() => {
    mountedRef.current = true;

    // Conditions de sortie précoces
    if (ablyLoading || !enabled || !channelId || !client) {
      if (mountedRef.current) {
        setIsLoading(ablyLoading || !enabled);
      }
      return;
    }

    const channelName = getClassChannelName(channelId);
    currentChannelNameRef.current = channelName;

    console.log(`🎯 [useAblyPresence] - Initializing presence for channel: ${channelName} (${componentIdRef.current})`);

    const initializePresence = async () => {
      if (!mountedRef.current) return;

      try {
        setIsLoading(true);
        setError(null);

        let channelInfo = globalThis.activePresenceChannels.get(channelName);
        
        // CORRECTION: Créer ou réutiliser le canal global
        if (!channelInfo) {
          console.log(`🆕 [useAblyPresence] - Creating new global channel: ${channelName}`);
          
          const channel = client.channels.get(channelName);
          channelRef.current = channel;
          
          channelInfo = {
            refCount: 0,
            channel: channel,
            members: new Map()
          };
          
          globalThis.activePresenceChannels.set(channelName, channelInfo);
          
          // Configurer les handlers pour le nouveau canal
          setupPresenceHandlers(channel, channelName);
          
          // Attacher le canal
          if (channel.state !== 'attached') {
            await channel.attach();
          }
        } else {
          console.log(`🔁 [useAblyPresence] - Reusing existing global channel: ${channelName}`);
          channelRef.current = channelInfo.channel;
        }

        // CORRECTION: Incrémenter le compteur de références
        manageChannelRefCount(channelName, true);

        // Mettre à jour l'état de connexion
        if (channelRef.current.state === 'attached') {
          setIsConnected(true);
          setIsLoading(false);
        }

      } catch (err) {
        if (mountedRef.current) {
          console.error(`❌ [useAblyPresence] - Failed to initialize presence for ${channelName}:`, err);
          setError(err as AblyErrorInfo);
          setIsLoading(false);
          setIsConnected(false);
        }
      }
    };

    initializePresence();

    // CORRECTION: Nettoyage simplifié et sécurisé
    return () => {
      mountedRef.current = false;
      
      const channelNameToCleanup = currentChannelNameRef.current;
      if (channelNameToCleanup) {
        console.log(`🧹 [useAblyPresence] - Cleaning up presence for channel: ${channelNameToCleanup} (${componentIdRef.current})`);
        
        // CORRECTION: Décrémenter le compteur de références seulement
        manageChannelRefCount(channelNameToCleanup, false);
        
        // Réinitialiser les références locales
        channelRef.current = null;
        currentChannelNameRef.current = null;
      }
      
      if (mountedRef.current) {
        setIsConnected(false);
        setIsLoading(false);
      }
    };
  }, [channelId, enabled, client, ablyLoading, manageChannelRefCount, setupPresenceHandlers]);

  // CORRECTION: Fonctions de présence avec gestion d'état améliorée
  const enterPresence = useCallback(async (userData: Omit<AblyPresenceMember, 'id'>) => {
    const channel = channelRef.current;
    if (!channel || !isConnected || isEnteringRef.current) {
      console.warn('⚠️ [useAblyPresence] - Cannot enter presence: channel not ready or already entering', {
        hasChannel: !!channel,
        isConnected,
        isEntering: isEnteringRef.current
      });
      return;
    }
    
    isEnteringRef.current = true;
    try {
      console.log(`🎯 [useAblyPresence] - Entering presence for user: ${client?.auth.clientId}`, userData);
      await channel.presence.enter(userData);
      console.log(`✅ [useAblyPresence] - Successfully entered presence`);
    } catch (err) {
      console.error('❌ [useAblyPresence] - Error entering presence:', err);
      setError(err as AblyErrorInfo);
    } finally {
      isEnteringRef.current = false;
    }
  }, [client?.auth.clientId, isConnected]);
  
  const leavePresence = useCallback(async () => {
    const channel = channelRef.current;
    if (!channel || !isConnected) {
      console.warn('⚠️ [useAblyPresence] - Cannot leave presence: channel not ready');
      return;
    }
    
    try {
      console.log(`🚪 [useAblyPresence] - Leaving presence for user: ${client?.auth.clientId}`);
      await channel.presence.leave();
      console.log(`✅ [useAblyPresence] - Successfully left presence`);
    } catch (err) {
      console.error('❌ [useAblyPresence] - Error leaving presence:', err);
    }
  }, [client?.auth.clientId, isConnected]);

  const updatePresence = useCallback(async (userData: Omit<AblyPresenceMember, 'id'>) => {
    const channel = channelRef.current;
    if (!channel || !isConnected) {
      console.warn('⚠️ [useAblyPresence] - Cannot update presence: channel not ready');
      return;
    }
    
    try {
      console.log(`📝 [useAblyPresence] - Updating presence for user: ${client?.auth.clientId}`, userData);
      await channel.presence.update(userData);
      console.log(`✅ [useAblyPresence] - Successfully updated presence`);
    } catch (err) {
      console.error('❌ [useAblyPresence] - Error updating presence:', err);
      setError(err as AblyErrorInfo);
    }
  }, [client?.auth.clientId, isConnected]);

  // CORRECTION : Gestion des erreurs de connexion Ably
  useEffect(() => {
    if (connectionError) {
      setError(connectionError);
      setIsConnected(false);
    }
  }, [connectionError]);

  return { 
    onlineMembers, 
    isConnected, 
    error, 
    isLoading: isLoading || ablyLoading,
    enterPresence, 
    leavePresence, 
    updatePresence 
  };
};