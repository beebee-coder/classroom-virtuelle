// src/hooks/useAblyPresence.ts - VERSION CORRIGÉE
'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useAbly } from './useAbly';
import type { AblyPresenceMember } from '@/lib/ably/types';
import { getClassChannelName } from '@/lib/ably/channels';
import Ably from 'ably';
import { Role } from '@prisma/client';
import { useAblyHealth } from './useAblyHealth';

type AblyChannel = Ably.Types.RealtimeChannelCallbacks;
type AblyChannelStateChange = Ably.Types.ChannelStateChange;
type AblyPresenceMessage = Ably.Types.PresenceMessage;
type AblyErrorInfo = Ably.Types.ErrorInfo;

interface UseAblyPresenceReturn {
  onlineMembers: AblyPresenceMember[];
  isConnected: boolean;
  error: string | null;
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
    listeners: Set<string>;
    lastPresenceUpdate: number;
  }>;
}

if (typeof globalThis.activePresenceChannels === 'undefined') {
  globalThis.activePresenceChannels = new Map();
}

const PRESENCE_UPDATE_DELAY_MS = 2000;
const MAX_PRESENCE_UPDATES_PER_MINUTE = 30;

export const useAblyPresence = (
  channelId?: string, 
  enabled: boolean = true, 
  componentName: string = 'UnknownPresenceComponent' // ✅ CORRECTION: Nom plus descriptif
): UseAblyPresenceReturn => {
  // ✅ CORRECTION: Vérification du nom du composant
  const actualComponentName = componentName === 'UnknownPresenceComponent' 
    ? `useAblyPresence-${channelId || 'no-channel'}` 
    : componentName;

  const { client, connectionState } = useAbly(actualComponentName); // ✅ CORRECTION: Utilisation du nom corrigé
  const { isConnected: ablyConnected, error: healthError } = useAblyHealth(actualComponentName);
  
  const [onlineMembers, setOnlineMembers] = useState<AblyPresenceMember[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<AblyChannel | null>(null);
  const isEnteringRef = useRef(false);
  const mountedRef = useRef(true);
  const currentChannelNameRef = useRef<string | null>(null);
  const componentIdRef = useRef(`presence_${Math.random().toString(36).substring(2, 8)}`);
  
  const lastPresenceUpdateRef = useRef<number>(0);
  const presenceUpdateCountRef = useRef<number>(0);
  const presenceUpdateResetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isLoading = useMemo(() => 
    connectionState === 'initialized' || connectionState === 'connecting', 
    [connectionState]
  );


  const canUpdatePresence = useCallback(() => {
    const now = Date.now();
    
    if (presenceUpdateResetTimeoutRef.current === null) {
      presenceUpdateResetTimeoutRef.current = setTimeout(() => {
        presenceUpdateCountRef.current = 0;
        presenceUpdateResetTimeoutRef.current = null;
      }, 60000);
    }
    
    if (presenceUpdateCountRef.current >= MAX_PRESENCE_UPDATES_PER_MINUTE) {
      console.warn(`⏸️ [PRESENCE HOOK] - Rate limiting: ${presenceUpdateCountRef.current} updates cette minute`);
      return false;
    }
    
    if (now - lastPresenceUpdateRef.current < PRESENCE_UPDATE_DELAY_MS) {
      console.warn(`⏸️ [PRESENCE HOOK] - Délai trop court depuis dernière update: ${now - lastPresenceUpdateRef.current}ms`);
      return false;
    }
    
    return true;
  }, []);

  const isValidRole = useCallback((role: any): role is Role => {
    return Object.values(Role).includes(role);
  }, []);

  const extractPresenceData = useCallback((message: AblyPresenceMessage): AblyPresenceMember | null => {
    if (!message.clientId) {
      console.warn('⚠️ [PRESENCE HOOK] - Message de présence sans clientId:', message);
      return null;
    }

    try {
      let presenceData: Omit<AblyPresenceMember, 'id'>;
      
      if (typeof message.data === 'object' && message.data !== null) {
        presenceData = { 
          name: (message.data as any).name || `User ${message.clientId}`,
          role: (message.data as any).role || Role.ELEVE,
          image: (message.data as any).image || null,
          data: (message.data as any).data || {}
        };
      } else if (typeof message.data === 'string') {
        try {
          const parsedData = JSON.parse(message.data);
          presenceData = {
            name: parsedData.name || `User ${message.clientId}`,
            role: parsedData.role || Role.ELEVE,
            image: parsedData.image || null,
            data: parsedData.data || {}
          };
        } catch {
          presenceData = { 
            name: message.data, 
            role: Role.ELEVE,
            image: null,
            data: {}
          };
        }
      } else {
        presenceData = { 
          name: `User ${message.clientId}`, 
          role: Role.ELEVE,
          image: null,
          data: {
            userId: message.clientId.startsWith('cmi') ? message.clientId : undefined
          }
        };
      }

      if (!isValidRole(presenceData.role)) {
        console.warn(`⚠️ [PRESENCE HOOK] - Rôle invalide: ${presenceData.role}, utilisation de ELEVE par défaut`);
        presenceData.role = Role.ELEVE;
      }

      return {
        id: message.clientId,
        ...presenceData
      };
    } catch (error) {
      console.error('❌ [PRESENCE HOOK] - Erreur lors de l\'extraction des données de présence:', error);
      return null;
    }
  }, [isValidRole]);

  const updateOnlineMembers = useCallback(() => {
    if (!mountedRef.current) return;
    
    const channelName = currentChannelNameRef.current;
    if (!channelName) return;

    const channelInfo = globalThis.activePresenceChannels.get(channelName);
    if (channelInfo) {
      const membersArray = Array.from(channelInfo.members.values());
      setOnlineMembers(membersArray);
    } else {
      setOnlineMembers([]);
    }
  }, []);

  const manageChannelRefCount = useCallback((channelName: string, increment: boolean) => {
    if (!mountedRef.current) return;

    const channelInfo = globalThis.activePresenceChannels.get(channelName);
    if (!channelInfo) return;

    if (increment) {
      channelInfo.refCount++;
      channelInfo.listeners.add(componentIdRef.current);
    } else {
      channelInfo.refCount = Math.max(0, channelInfo.refCount - 1);
      channelInfo.listeners.delete(componentIdRef.current);
      
      if (channelInfo.refCount === 0) {
        console.log(`⏳ [PRESENCE HOOK] - Plus de composants actifs pour ${channelName}, planification du nettoyage.`);
        setTimeout(() => {
          const currentChannelInfo = globalThis.activePresenceChannels.get(channelName);
          if (currentChannelInfo && currentChannelInfo.refCount === 0) {
            console.log(`🧹 [PRESENCE HOOK] - Détachement du canal ${channelName}`);
            try {
              currentChannelInfo.channel.detach();
            } catch (error) {
              console.warn('⚠️ [PRESENCE HOOK] - Erreur lors du détachement du canal:', error);
            }
            globalThis.activePresenceChannels.delete(channelName);
          }
        }, 15000);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    if (!enabled || !channelId || !client) {
      return;
    }

    const channelName = getClassChannelName(channelId);
    currentChannelNameRef.current = channelName;

    console.log(`🎯 [PRESENCE HOOK] - Initialisation pour canal: ${channelName} (${actualComponentName})`); // ✅ CORRECTION: Utilisation du nom corrigé

    const initializePresence = async () => {
      if (!mountedRef.current) return;

      try {
        setError(null);
        let channelInfo = globalThis.activePresenceChannels.get(channelName);
        
        if (!channelInfo) {
          console.log(`🆕 [PRESENCE HOOK] - Création nouveau canal global: ${channelName}`);
          const channel = client.channels.get(channelName);
          channelRef.current = channel;
          
          channelInfo = { 
            refCount: 0, 
            channel, 
            members: new Map(),
            listeners: new Set(),
            lastPresenceUpdate: Date.now()
          };
          globalThis.activePresenceChannels.set(channelName, channelInfo);
          
          const stateHandler = (stateChange: AblyChannelStateChange) => {
            if (!mountedRef.current) return;
            
            console.log(`🔌 [PRESENCE HOOK] - État du canal: ${stateChange.previous} → ${stateChange.current} pour ${channelName}`);
            
            if (stateChange.current === 'attached') {
              setIsConnected(true);
              setError(null);
              
              channelInfo!.lastPresenceUpdate = Date.now();
              
              setTimeout(() => {
                if (mountedRef.current && channel.state === 'attached') {
                  initializePresenceData(channel, channelInfo!);
                }
              }, 1000);
            } else if (['detached', 'failed', 'suspended'].includes(stateChange.current)) {
              setIsConnected(false);
              if (stateChange.reason) {
                setError(stateChange.reason.message);
                console.error(`❌ [PRESENCE HOOK] - Erreur de canal ${channelName}:`, stateChange.reason);
              }
            }
          };

          const onPresenceUpdate = (message: AblyPresenceMessage) => {
            if (!mountedRef.current) return;

            const currentMembers = channelInfo!.members;
            const presenceMember = extractPresenceData(message);

            if (!presenceMember) {
              return;
            }

            switch (message.action) {
              case 'present':
              case 'enter':
              case 'update':
                currentMembers.set(message.clientId!, presenceMember);
                break;
              case 'leave':
              case 'absent':
                currentMembers.delete(message.clientId!);
                break;
            }
            
            setTimeout(updateOnlineMembers, 100);
          };

          const initializePresenceData = (targetChannel: AblyChannel, targetChannelInfo: { 
            refCount: number; 
            channel: AblyChannel;
            members: Map<string, AblyPresenceMember>;
            listeners: Set<string>;
            lastPresenceUpdate: number;
          }) => {
            if (!targetChannelInfo) {
              console.error('❌ [PRESENCE HOOK] - targetChannelInfo est undefined');
              return;
            }

            try {
              targetChannel.presence.get((err, members) => {
                if (!mountedRef.current) return;
                if (err) {
                  console.error('❌ [PRESENCE HOOK] - Erreur récupération de la présence:', err);
                  return;
                }
                
                if (members && Array.isArray(members)) {
                  console.log(`🔍 [PRESENCE HOOK] - Récupération de ${members.length} membres présents`);
                  targetChannelInfo.members.clear();
                  members.forEach((member: AblyPresenceMessage) => {
                    const presenceMember = extractPresenceData(member);
                    if (presenceMember) {
                      targetChannelInfo.members.set(member.clientId!, presenceMember);
                    }
                  });
                  updateOnlineMembers();
                } else {
                  targetChannelInfo.members.clear();
                  updateOnlineMembers();
                }
              });
            } catch (err) {
              if (mountedRef.current) {
                console.error('❌ [PRESENCE HOOK] - Erreur getPresence:', err);
              }
            }
          };

          channel.on(stateHandler);
          channel.presence.subscribe(onPresenceUpdate);

          if (channel.state !== 'attached' && channel.state !== 'attaching') {
            await channel.attach();
          }
        } else {
          console.log(`🔁 [PRESENCE HOOK] - Réutilisation canal global: ${channelName}`);
          channelRef.current = channelInfo.channel;
          
          if (channelInfo.channel.state === 'attached') {
            setIsConnected(true);
            setTimeout(updateOnlineMembers, 200);
          }
        }

        manageChannelRefCount(channelName, true);

      } catch (err) {
        if (mountedRef.current) {
          console.error(`❌ [PRESENCE HOOK] - Échec initialisation pour ${channelName}:`, err);
          setError((err as AblyErrorInfo).message);
          setIsConnected(false);
        }
      }
    };

    setTimeout(initializePresence, Math.random() * 1000);

    return () => {
      mountedRef.current = false;
      
      if (presenceUpdateResetTimeoutRef.current) {
        clearTimeout(presenceUpdateResetTimeoutRef.current);
        presenceUpdateResetTimeoutRef.current = null;
      }
      
      const channelNameToCleanup = currentChannelNameRef.current;
      if (channelNameToCleanup) {
        console.log(`🧹 [PRESENCE HOOK] - Nettoyage pour canal: ${channelNameToCleanup}`);
        manageChannelRefCount(channelNameToCleanup, false);
        channelRef.current = null;
        currentChannelNameRef.current = null;
      }
    };
  }, [channelId, enabled, client, manageChannelRefCount, updateOnlineMembers, extractPresenceData, actualComponentName]); // ✅ CORRECTION: Ajout de la dépendance

  const enterPresence = useCallback(async (userData: Omit<AblyPresenceMember, 'id'>) => {
    const channel = channelRef.current;
    if (!channel || !isConnected || isEnteringRef.current) {
      console.warn('⚠️ [PRESENCE HOOK] - Impossible d\'entrer en présence: canal pas prêt');
      throw new Error('Canal de présence non disponible');
    }
    
    if (!canUpdatePresence()) {
      console.warn('⏸️ [PRESENCE HOOK] - Rate limiting activé, report de l\'entrée en présence');
      throw new Error('Rate limiting: trop de mises à jour de présence');
    }
    
    isEnteringRef.current = true;
    try {
      console.log(`➡️ [PRESENCE HOOK] - Entrée en présence pour: ${client?.auth.clientId}`);
      
      const presenceData = {
        name: userData.name || 'Utilisateur',
        role: userData.role || Role.ELEVE,
        image: userData.image || null,
        data: userData.data || {}
      };
      
      lastPresenceUpdateRef.current = Date.now();
      presenceUpdateCountRef.current++;
      
      await channel.presence.enter(presenceData);
      
      const channelName = currentChannelNameRef.current;
      if (channelName) {
        const channelInfo = globalThis.activePresenceChannels.get(channelName);
        if (channelInfo) {
          channelInfo.lastPresenceUpdate = Date.now();
        }
      }
    } catch (err) {
      console.error('❌ [PRESENCE HOOK] - Erreur d\'entrée en présence:', err);
      setError((err as AblyErrorInfo).message);
      throw err;
    } finally {
      isEnteringRef.current = false;
    }
  }, [client?.auth.clientId, isConnected, canUpdatePresence]);
  
  const leavePresence = useCallback(async () => {
    const channel = channelRef.current;
    if (!channel || !isConnected) {
      console.warn('⚠️ [PRESENCE HOOK] - Impossible de quitter la présence: canal non disponible');
      return;
    }
    
    try {
      console.log(`⬅️ [PRESENCE HOOK] - Sortie de présence pour: ${client?.auth.clientId}`);
      await channel.presence.leave();
    } catch (err) {
      console.error('❌ [PRESENCE HOOK] - Erreur de sortie:', err);
    }
  }, [client?.auth.clientId, isConnected]);

  const updatePresence = useCallback(async (userData: Omit<AblyPresenceMember, 'id'>) => {
    const channel = channelRef.current;
    if (!channel || !isConnected) {
      console.warn('⚠️ [PRESENCE HOOK] - Impossible de mettre à jour la présence: canal non disponible');
      return;
    }
    
    if (!canUpdatePresence()) {
      console.warn('⏸️ [PRESENCE HOOK] - Rate limiting activé, report de la mise à jour');
      return;
    }
    
    try {
      lastPresenceUpdateRef.current = Date.now();
      presenceUpdateCountRef.current++;
      
      await channel.presence.update(userData);
      
      const channelName = currentChannelNameRef.current;
      if (channelName) {
        const channelInfo = globalThis.activePresenceChannels.get(channelName);
        if (channelInfo) {
          channelInfo.lastPresenceUpdate = Date.now();
        }
      }
    } catch (err) {
      console.error('❌ [PRESENCE HOOK] - Erreur de mise à jour:', err);
      setError((err as AblyErrorInfo).message);
    }
  }, [isConnected, canUpdatePresence]);

  useEffect(() => {
    if (healthError) {
      setError(healthError);
      setIsConnected(false);
    }
  }, [healthError]);

  useEffect(() => {
    if (!ablyConnected) {
      setIsConnected(false);
    }
  }, [ablyConnected]);

  return { 
    onlineMembers, 
    isConnected, 
    error, 
    isLoading, 
    enterPresence, 
    leavePresence, 
    updatePresence 
  };
};
