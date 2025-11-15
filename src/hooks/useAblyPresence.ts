// src/hooks/useAblyPresence.ts - VERSION COMPLÈTE CORRIGÉE
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAblyWithSession } from './useAblyWithSession';
import type { AblyPresenceMember } from '@/lib/ably/types';
import { getClassChannelName } from '@/lib/ably/channels';
import Ably from 'ably';

interface UseAblyPresenceReturn {
  onlineMembers: AblyPresenceMember[];
  isConnected: boolean;
  error: Ably.Types.ErrorInfo | null;
  isLoading: boolean;
  enterPresence: (userData: Omit<AblyPresenceMember, 'id'>) => Promise<void>;
  leavePresence: () => Promise<void>;
  updatePresence: (userData: Omit<AblyPresenceMember, 'id'>) => Promise<void>;
}

export const useAblyPresence = (channelId?: string, enabled: boolean = true): UseAblyPresenceReturn => {
  const { client, connectionError, isLoading: ablyLoading } = useAblyWithSession();
  const [onlineMembers, setOnlineMembers] = useState<AblyPresenceMember[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Ably.Types.ErrorInfo | null>(null);

  const channelRef = useRef<Ably.Types.RealtimeChannelCallbacks | null>(null);
  const isEnteringRef = useRef(false);
  const presenceMembersRef = useRef<Map<string, AblyPresenceMember>>(new Map());
  const presenceUpdateListenerRef = useRef<((message: Ably.Types.PresenceMessage) => void) | null>(null);
  const stateHandlerRef = useRef<((stateChange: Ably.Types.ChannelStateChange) => void) | null>(null);
  const hasInitializedRef = useRef(false);
  const currentChannelNameRef = useRef<string | null>(null); // CORRECTION: Ajout de la référence manquante

  // CORRECTION : Fonction unique pour mettre à jour les membres
  const updateOnlineMembers = useCallback(() => {
    const membersArray = Array.from(presenceMembersRef.current.values());
    console.log(`📊 [useAblyPresence] - ${membersArray.length} members after update:`, membersArray);
    setOnlineMembers(membersArray);
  }, []);

  // CORRECTION : Initialisation cohérente
  const initializePresence = useCallback(async () => {
    const channel = channelRef.current;
    if (!channel || !isConnected) {
      console.warn('⚠️ [useAblyPresence] - Cannot initialize presence: channel not ready');
      return;
    }

    // CORRECTION: Éviter les initialisations multiples
    if (hasInitializedRef.current) {
      console.log('⏭️ [useAblyPresence] - Presence already initialized, skipping');
      return;
    }

    try {
      setIsLoading(true);
      console.log(`🔍 [useAblyPresence] - Initializing presence tracking`);
      
      // CORRECTION ABLY: Ne pas utiliser channel.presence.get() car il retourne void
      presenceMembersRef.current.clear();
      updateOnlineMembers();
      setError(null);
      
      // CORRECTION: NE PAS marquer comme initialisé immédiatement
      console.log('⏳ [useAblyPresence] - Presence initialization started, waiting for presence events');

    } catch (err) {
      console.error('❌ [useAblyPresence] - Error initializing presence:', err);
      setError(err as Ably.Types.ErrorInfo);
      setIsLoading(false);
    }
  }, [isConnected, updateOnlineMembers]);

  useEffect(() => {
    if (ablyLoading || !enabled || !channelId || !client) {
      setIsLoading(ablyLoading || !enabled);
      return;
    }

    const channelName = getClassChannelName(channelId);
    
    // CORRECTION: Vérification robuste pour éviter les réinitialisations
    if (currentChannelNameRef.current === channelName && channelRef.current) {
      console.log(`⏭️ [useAblyPresence] - Same channel ${channelName} already set up, skipping reinitialization`);
      return;
    }

    // CORRECTION: Nettoyer l'ancien canal si différent
    if (currentChannelNameRef.current && currentChannelNameRef.current !== channelName) {
      console.log(`🔄 [useAblyPresence] - Channel changed from ${currentChannelNameRef.current} to ${channelName}, cleaning up`);
      const oldChannel = channelRef.current;
      if (oldChannel) {
        if (stateHandlerRef.current) {
          oldChannel.off(stateHandlerRef.current);
        }
        if (presenceUpdateListenerRef.current) {
          oldChannel.presence.unsubscribe(presenceUpdateListenerRef.current);
        }
      }
    }

    const channel = client.channels.get(channelName);
    channelRef.current = channel;
    currentChannelNameRef.current = channelName;

    console.log(`📡 [useAblyPresence] - Setting up channel: ${channelName}`);

    // CORRECTION : Gestionnaire d'état unifié avec meilleure gestion des transitions
    const stateHandler = (stateChange: Ably.Types.ChannelStateChange) => {
      console.log(`🔌 [useAblyPresence] - Channel state: ${stateChange.previous} → ${stateChange.current} for ${channelName}`);
      
      if (stateChange.current === 'attached') {
        console.log(`✅ [useAblyPresence] - Attached to channel: ${channelName}`);
        setIsConnected(true);
        // CORRECTION: Réinitialiser le flag d'initialisation lors du réattachement
        hasInitializedRef.current = false;
      } else if (stateChange.current === 'detached') {
        console.warn(`⚠️ [useAblyPresence] - Detached from channel: ${channelName}`);
        setIsConnected(false);
        hasInitializedRef.current = false;
      } else if (stateChange.current === 'failed') {
        console.error(`❌ [useAblyPresence] - Channel failed: ${channelName}`, stateChange.reason);
        if (stateChange.reason) {
          setError(stateChange.reason);
        }
        setIsConnected(false);
        hasInitializedRef.current = false;
      } else if (stateChange.current === 'suspended') {
        console.warn(`⏸️ [useAblyPresence] - Channel suspended: ${channelName}`);
        setIsConnected(false);
        hasInitializedRef.current = false;
      }
    };

    // CORRECTION : Gestionnaire de présence amélioré avec gestion des états initiaux
    const onPresenceUpdate = (message: Ably.Types.PresenceMessage) => {
      console.log(`🔄 [useAblyPresence] - Presence update on ${channelName}`, {
        action: message.action,
        clientId: message.clientId,
        data: message.data
      });

      const currentMembers = presenceMembersRef.current;

      // CORRECTION: Traitement cohérent de tous les types d'actions
      switch (message.action) {
        case 'present':
          if (message.clientId && message.data) {
            currentMembers.set(message.clientId, {
              id: message.clientId,
              ...(message.data as Omit<AblyPresenceMember, 'id'>)
            });
          }
          break;
          
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
      
      // CORRECTION: Marquer comme initialisé après le premier événement de présence
      if (!hasInitializedRef.current) {
        console.log('✅ [useAblyPresence] - Presence sync completed, marking as initialized');
        hasInitializedRef.current = true;
        setIsLoading(false);
      }
      
      updateOnlineMembers();
    };

    // Stocker les références pour le cleanup
    stateHandlerRef.current = stateHandler;
    presenceUpdateListenerRef.current = onPresenceUpdate;

    const attachAndSubscribe = async () => {
      try {
        setIsLoading(true);
        setError(null);
        hasInitializedRef.current = false;

        // CORRECTION: Vérifier l'état actuel avant de s'abonner
        if (channel.state === 'attached' && hasInitializedRef.current) {
          console.log(`⏭️ [useAblyPresence] - Channel ${channelName} already attached and initialized, skipping`);
          setIsLoading(false);
          return;
        }

        // CORRECTION: S'abonner aux événements avant l'attachement
        channel.on(stateHandler);
        channel.presence.subscribe(onPresenceUpdate);

        // CORRECTION: Logique d'attachement améliorée
        if (channel.state === 'initialized' || channel.state === 'detached') {
          await channel.attach();
          // L'initialisation se fera via le stateHandler après l'attachement
        } else if (channel.state === 'attached') {
          // Déjà attaché, déclencher manuellement l'initialisation
          console.log('🔄 [useAblyPresence] - Channel already attached, triggering initialization');
          initializePresence();
        }

      } catch (err) {
        console.error(`❌ [useAblyPresence] - Failed to attach to ${channelName}:`, err);
        setError(err as Ably.Types.ErrorInfo);
        setIsLoading(false);
        hasInitializedRef.current = false;
      }
    };

    attachAndSubscribe();

    return () => {
      // CORRECTION: Ne nettoyer que si c'est exactement le même canal
      // et éviter le nettoyage pendant les Fast Refresh
      if (currentChannelNameRef.current === channelName && !enabled) {
        console.log(`🧹 [useAblyPresence] - Cleaning up channel: ${channelName}`);
        
        const channel = channelRef.current;
        if (channel) {
          if (stateHandlerRef.current) {
            channel.off(stateHandlerRef.current);
          }
          if (presenceUpdateListenerRef.current) {
            channel.presence.unsubscribe(presenceUpdateListenerRef.current);
          }
        }
        
        // CORRECTION: Ne réinitialiser que les références spécifiques
        channelRef.current = null;
        stateHandlerRef.current = null;
        presenceUpdateListenerRef.current = null;
        hasInitializedRef.current = false;
        
        setIsConnected(false);
        setIsLoading(false);
      }
    };
  }, [channelId, enabled, client, initializePresence, ablyLoading, updateOnlineMembers]);
  
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
      setError(err as Ably.Types.ErrorInfo);
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
      
      // CORRECTION: Retirer immédiatement de la liste locale
      if (client?.auth.clientId) {
        presenceMembersRef.current.delete(client.auth.clientId);
        updateOnlineMembers();
      }
    } catch (err) {
      console.error('❌ [useAblyPresence] - Error leaving presence:', err);
    }
  }, [client?.auth.clientId, isConnected, updateOnlineMembers]);

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
      setError(err as Ably.Types.ErrorInfo);
    }
  }, [client?.auth.clientId, isConnected]);

  // CORRECTION : Gestion des erreurs de connexion
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