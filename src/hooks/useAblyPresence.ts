// src/hooks/useAblyPresence.ts - VERSION CORRIGÉE
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAbly } from './useAbly';
import type { AblyPresenceMember } from '@/lib/ably/types';
import { getClassChannelName } from '@/lib/ably/channels';
import Ably from 'ably';

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
  const { client, connectionError, isConnected: ablyConnected, connectionState } = useAbly();
  const [onlineMembers, setOnlineMembers] = useState<AblyPresenceMember[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<AblyErrorInfo | null>(null);

  const channelRef = useRef<AblyChannel | null>(null);
  const isEnteringRef = useRef(false);
  const mountedRef = useRef(true);
  const currentChannelNameRef = useRef<string | null>(null);
  const componentIdRef = useRef(`presence_${Math.random().toString(36).substring(2, 8)}`);

  const isLoading = connectionState === 'initialized' || connectionState === 'connecting';

  const updateOnlineMembers = useCallback(() => {
    if (!mountedRef.current) return;
    
    const channelName = currentChannelNameRef.current;
    if (!channelName) return;

    const channelInfo = globalThis.activePresenceChannels.get(channelName);
    if (channelInfo) {
      const membersArray = Array.from(channelInfo.members.values());
      console.log(`📊 [PRESENCE HOOK] - Mise à jour de l'état: ${membersArray.length} membres en ligne (${componentIdRef.current})`);
      setOnlineMembers(membersArray);
    } else {
      setOnlineMembers([]);
    }
  }, []);

  const manageChannelRefCount = useCallback((channelName: string, increment: boolean) => {
    if (!mountedRef.current) return;

    let channelInfo = globalThis.activePresenceChannels.get(channelName);
    
    if (increment) {
      if (!channelInfo) return;
      channelInfo.refCount++;
      console.log(`📈 [PRESENCE HOOK] - Compteur pour canal ${channelName} augmenté à: ${channelInfo.refCount} (par ${componentIdRef.current})`);
    } else {
      if (channelInfo) {
        channelInfo.refCount = Math.max(0, channelInfo.refCount - 1);
        console.log(`📉 [PRESENCE HOOK] - Compteur pour canal ${channelName} diminué à: ${channelInfo.refCount} (par ${componentIdRef.current})`);
        
        if (channelInfo.refCount === 0) {
          console.log(`⏳ [PRESENCE HOOK] - Plus de composants actifs pour ${channelName}, planification du nettoyage.`);
          setTimeout(() => {
            const currentChannelInfo = globalThis.activePresenceChannels.get(channelName);
            if (currentChannelInfo && currentChannelInfo.refCount === 0) {
              console.log(`🧹 [PRESENCE HOOK] - Détachement du canal ${channelName}`);
              currentChannelInfo.channel.detach();
              globalThis.activePresenceChannels.delete(channelName);
            }
          }, 5000);
        }
      }
    }
  }, []);

  const setupPresenceHandlers = useCallback((channel: AblyChannel, channelName: string) => {
    if (!mountedRef.current) return;

    let channelInfo = globalThis.activePresenceChannels.get(channelName);
    if (!channelInfo) return;

    const stateHandler = (stateChange: AblyChannelStateChange) => {
      if (!mountedRef.current) return;
      
      console.log(`🔌 [PRESENCE HOOK] - État du canal: ${stateChange.previous} → ${stateChange.current} pour ${channelName} (${componentIdRef.current})`);
      
      if (stateChange.current === 'attached') {
        setIsConnected(true);
        setError(null);
      } else if (['detached', 'failed', 'suspended'].includes(stateChange.current)) {
        setIsConnected(false);
        if (stateChange.reason) setError(stateChange.reason);
      }
    };

    const onPresenceUpdate = (message: AblyPresenceMessage) => {
      if (!mountedRef.current) return;

      console.log(`🔄 [PRESENCE HOOK] - Mise à jour de présence sur ${channelName}: ${message.action} de ${message.clientId}`);

      const currentMembers = channelInfo.members;

      switch (message.action) {
        case 'present':
        case 'enter':
        case 'update':
          if (message.clientId && message.data) {
            currentMembers.set(message.clientId, { id: message.clientId, ...(message.data as Omit<AblyPresenceMember, 'id'>) });
          }
          break;
        case 'leave':
        case 'absent':
          if (message.clientId) {
            currentMembers.delete(message.clientId);
          }
          break;
      }
      
      updateOnlineMembers();
    };

    channel.on(stateHandler);
    channel.presence.subscribe(onPresenceUpdate);

    // CORRECTION: Utiliser la méthode avec callback comme dans la documentation Ably
    const initializePresence = () => {
      try {
        channel.presence.get((err, members) => {
          if (!mountedRef.current) return;
          if (err) {
            console.error('❌ [PRESENCE HOOK] - Erreur récupération de la présence:', err);
            return;
          }
          // CORRECTION: Vérifier que members existe et est un tableau
          if (members && Array.isArray(members)) {
            console.log(`🔍 [PRESENCE HOOK] - Récupération de ${members.length} membres présents`);
            channelInfo!.members.clear();
            members.forEach((member: AblyPresenceMessage) => {
              if (member.clientId && member.data) {
                channelInfo!.members.set(member.clientId, { 
                  id: member.clientId, 
                  ...(member.data as Omit<AblyPresenceMember, 'id'>) 
                });
              }
            });
            updateOnlineMembers();
          } else {
            console.warn('⚠️ [PRESENCE HOOK] - Aucun membre trouvé ou format invalide');
            channelInfo!.members.clear();
            updateOnlineMembers();
          }
        });
      } catch (err) {
        if (mountedRef.current) {
          console.error('❌ [PRESENCE HOOK] - Erreur getPresence:', err);
        }
      }
    };

    initializePresence();

    return { stateHandler, onPresenceUpdate };
  }, [updateOnlineMembers]);

  useEffect(() => {
    mountedRef.current = true;

    if (!enabled || !channelId || !client) return;

    const channelName = getClassChannelName(channelId);
    currentChannelNameRef.current = channelName;

    console.log(`🎯 [PRESENCE HOOK] - Initialisation pour canal: ${channelName} (${componentIdRef.current})`);

    const initializePresence = async () => {
      if (!mountedRef.current) return;

      try {
        setError(null);
        let channelInfo = globalThis.activePresenceChannels.get(channelName);
        
        if (!channelInfo) {
          console.log(`🆕 [PRESENCE HOOK] - Création nouveau canal global: ${channelName}`);
          const channel = client.channels.get(channelName);
          channelRef.current = channel;
          
          channelInfo = { refCount: 0, channel, members: new Map() };
          globalThis.activePresenceChannels.set(channelName, channelInfo);
          
          setupPresenceHandlers(channel, channelName);
          
          if (channel.state !== 'attached') await channel.attach();
        } else {
          console.log(`🔁 [PRESENCE HOOK] - Réutilisation canal global: ${channelName}`);
          channelRef.current = channelInfo.channel;
        }

        manageChannelRefCount(channelName, true);

        if (channelRef.current.state === 'attached') {
          setIsConnected(true);
          updateOnlineMembers();
        }

      } catch (err) {
        if (mountedRef.current) {
          console.error(`❌ [PRESENCE HOOK] - Échec initialisation pour ${channelName}:`, err);
          setError(err as AblyErrorInfo);
          setIsConnected(false);
        }
      }
    };

    initializePresence();

    return () => {
      mountedRef.current = false;
      const channelNameToCleanup = currentChannelNameRef.current;
      if (channelNameToCleanup) {
        console.log(`🧹 [PRESENCE HOOK] - Nettoyage pour canal: ${channelNameToCleanup} (${componentIdRef.current})`);
        manageChannelRefCount(channelNameToCleanup, false);
        channelRef.current = null;
        currentChannelNameRef.current = null;
      }
    };
  }, [channelId, enabled, client, manageChannelRefCount, setupPresenceHandlers, updateOnlineMembers]);

  const enterPresence = useCallback(async (userData: Omit<AblyPresenceMember, 'id'>) => {
    const channel = channelRef.current;
    if (!channel || !isConnected || isEnteringRef.current) {
      console.warn('⚠️ [PRESENCE HOOK] - Impossible d\'entrer en présence: canal pas prêt');
      return;
    }
    
    isEnteringRef.current = true;
    try {
      console.log(`➡️ [PRESENCE HOOK] - Entrée en présence pour: ${client?.auth.clientId}`);
      await channel.presence.enter(userData);
    } catch (err) {
      console.error('❌ [PRESENCE HOOK] - Erreur d\'entrée en présence:', err);
      setError(err as AblyErrorInfo);
    } finally {
      isEnteringRef.current = false;
    }
  }, [client?.auth.clientId, isConnected]);
  
  const leavePresence = useCallback(async () => {
    const channel = channelRef.current;
    if (!channel || !isConnected) return;
    try {
      console.log(`⬅️ [PRESENCE HOOK] - Sortie de présence pour: ${client?.auth.clientId}`);
      await channel.presence.leave();
    } catch (err) {
      console.error('❌ [PRESENCE HOOK] - Erreur de sortie:', err);
    }
  }, [client?.auth.clientId, isConnected]);

  const updatePresence = useCallback(async (userData: Omit<AblyPresenceMember, 'id'>) => {
    const channel = channelRef.current;
    if (!channel || !isConnected) return;
    try {
      console.log(`🔄 [PRESENCE HOOK] - Mise à jour présence pour: ${client?.auth.clientId}`);
      await channel.presence.update(userData);
    } catch (err) {
      console.error('❌ [PRESENCE HOOK] - Erreur de mise à jour:', err);
      setError(err as AblyErrorInfo);
    }
  }, [client?.auth.clientId, isConnected]);

  useEffect(() => {
    if (connectionError) setError(connectionError);
    else setError(null);
  }, [connectionError]);

  useEffect(() => {
    if (!ablyConnected && isConnected) setIsConnected(false);
  }, [ablyConnected, isConnected]);

  return { onlineMembers, isConnected, error, isLoading, enterPresence, leavePresence, updatePresence };
};