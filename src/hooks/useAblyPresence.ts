// src/hooks/useAblyPresence.ts
'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNamedAbly } from './useNamedAbly';
import type { AblyPresenceMember } from '@/lib/ably/types';
import { getClassChannelName } from '@/lib/ably/channels';
import type { Types as AblyTypes } from 'ably';
import { Role } from '@prisma/client';
import { useAblyHealth } from './useAblyHealth';

type AblyChannel = AblyTypes.RealtimeChannelCallbacks;
type AblyChannelStateChange = AblyTypes.ChannelStateChange;
type AblyPresenceMessage = AblyTypes.PresenceMessage;
type AblyErrorInfo = AblyTypes.ErrorInfo;

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

export const useAblyPresence = (
  channelId?: string, 
  enabled: boolean = true, 
  componentName: string = 'UnknownPresenceComponent'
): UseAblyPresenceReturn => {
  const actualComponentName = componentName === 'UnknownPresenceComponent' 
    ? `useAblyPresence-${channelId || 'no-channel'}` 
    : componentName;

  const { client, connectionState } = useNamedAbly(actualComponentName);
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

  const isLoading = useMemo(() => 
    connectionState === 'initialized' || connectionState === 'connecting', 
    [connectionState]
  );

  const canUpdatePresence = useCallback((): boolean => {
    const now = Date.now();
    
    if (now - lastPresenceUpdateRef.current < PRESENCE_UPDATE_DELAY_MS) {
      return false;
    }
    return true;
  }, []);

  const isValidRole = useCallback((role: any): role is Role => {
    return Object.values(Role).includes(role);
  }, []);

  const extractPresenceData = useCallback((message: AblyPresenceMessage): AblyPresenceMember | null => {
    if (!message.clientId) {
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
        setTimeout(() => {
          const currentChannelInfo = globalThis.activePresenceChannels.get(channelName);
          if (currentChannelInfo && currentChannelInfo.refCount === 0) {
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

    const initializePresence = async () => {
      if (!mountedRef.current) return;

      try {
        setError(null);
        let channelInfo = globalThis.activePresenceChannels.get(channelName);
        
        if (!channelInfo) {
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
            
            if (stateChange.current === 'attached') {
              setIsConnected(true);
              setError(null);
              
              if (channelInfo) {
                channelInfo.lastPresenceUpdate = Date.now();
              }
              
              setTimeout(() => {
                if (mountedRef.current && channel.state === 'attached' && channelInfo) {
                  initializePresenceData(channel, channelInfo);
                }
              }, 1000);
            } else if (['detached', 'failed', 'suspended'].includes(stateChange.current)) {
              setIsConnected(false);
              if (stateChange.reason) {
                setError(stateChange.reason.message);
              }
            }
          };

          const onPresenceUpdate = (message: AblyPresenceMessage) => {
            if (!mountedRef.current) return;

            const currentChannelInfo = globalThis.activePresenceChannels.get(channelName);
            if (!currentChannelInfo) return;

            const presenceMember = extractPresenceData(message);

            if (!presenceMember) {
              return;
            }

            switch (message.action) {
              case 'present':
              case 'enter':
              case 'update':
                currentChannelInfo.members.set(message.clientId!, presenceMember);
                break;
              case 'leave':
              case 'absent':
                currentChannelInfo.members.delete(message.clientId!);
                break;
            }
            
            setTimeout(updateOnlineMembers, 100);
          };

          const initializePresenceData = (targetChannel: AblyChannel, targetChannelInfo: any) => {
            if (!targetChannelInfo) {
              return;
            }

            try {
              targetChannel.presence.get((err: AblyErrorInfo | null, members: AblyPresenceMessage[] | null) => {
                if (!mountedRef.current) return;
                if (err) {
                  return;
                }
                
                if (members && Array.isArray(members)) {
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
          channelRef.current = channelInfo.channel;
          
          if (channelInfo.channel.state === 'attached') {
            setIsConnected(true);
            setTimeout(updateOnlineMembers, 200);
          }
        }

        manageChannelRefCount(channelName, true);

      } catch (err) {
        if (mountedRef.current) {
          setError((err as AblyErrorInfo).message);
          setIsConnected(false);
        }
      }
    };

    setTimeout(initializePresence, Math.random() * 1000);

    return () => {
      mountedRef.current = false;
      
      const channelNameToCleanup = currentChannelNameRef.current;
      if (channelNameToCleanup) {
        manageChannelRefCount(channelNameToCleanup, false);
        channelRef.current = null;
        currentChannelNameRef.current = null;
      }
    };
  }, [channelId, enabled, client, manageChannelRefCount, updateOnlineMembers, extractPresenceData, actualComponentName]);

  const enterPresence = useCallback(async (userData: Omit<AblyPresenceMember, 'id'>) => {
    const channel = channelRef.current;
    if (!channel || !isConnected || isEnteringRef.current) {
      throw new Error('Canal de présence non disponible');
    }
    
    if (!canUpdatePresence()) {
      return;
    }
    
    isEnteringRef.current = true;
    try {
      const presenceData = {
        name: userData.name || 'Utilisateur',
        role: userData.role || Role.ELEVE,
        image: userData.image || null,
        data: userData.data || {}
      };
      
      lastPresenceUpdateRef.current = Date.now();
      
      await channel.presence.enter(presenceData);
      
      const channelName = currentChannelNameRef.current;
      if (channelName) {
        const channelInfo = globalThis.activePresenceChannels.get(channelName);
        if (channelInfo) {
          channelInfo.lastPresenceUpdate = Date.now();
        }
      }
    } catch (err) {
      setError((err as AblyErrorInfo).message);
      throw err;
    } finally {
      isEnteringRef.current = false;
    }
  }, [isConnected, canUpdatePresence]);
  
  const leavePresence = useCallback(async () => {
    const channel = channelRef.current;
    if (!channel || !isConnected) {
      return;
    }
    
    try {
      await channel.presence.leave();
    } catch (err) {
      console.error('❌ [PRESENCE HOOK] - Erreur de sortie:', err);
    }
  }, [isConnected]);

  const updatePresence = useCallback(async (userData: Omit<AblyPresenceMember, 'id'>) => {
    const channel = channelRef.current;
    if (!channel || !isConnected) {
      return;
    }
    
    if (!canUpdatePresence()) {
      return;
    }
    
    try {
      lastPresenceUpdateRef.current = Date.now();
      
      await channel.presence.update(userData);
      
      const channelName = currentChannelNameRef.current;
      if (channelName) {
        const channelInfo = globalThis.activePresenceChannels.get(channelName);
        if (channelInfo) {
          channelInfo.lastPresenceUpdate = Date.now();
        }
      }
    } catch (err) {
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
