// src/hooks/useAblyPresence.ts - VERSION CORRIGÉE POUR ABLY v2+
'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNamedAbly } from './useNamedAbly';
import type { AblyPresenceMember } from '@/lib/ably/types';
import { getClassChannelName } from '@/lib/ably/channels';
import Ably, {
  type RealtimeChannel,
  type ChannelStateChange,
  type PresenceMessage,
  type ErrorInfo,
} from 'ably';
import { Role } from '@prisma/client';
import { useAblyHealth } from './useAblyHealth';

type AblyChannel = RealtimeChannel;
type AblyChannelStateChange = ChannelStateChange;
type AblyPresenceMessage = PresenceMessage;
type AblyErrorInfo = ErrorInfo;

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
    stateHandler?: (stateChange: AblyChannelStateChange) => void;
    presenceHandler?: (message: AblyPresenceMessage) => void;
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

  const updateLocalStateFromGlobal = useCallback((channelName: string) => {
    if (!mountedRef.current) return;
    const channelInfo = globalThis.activePresenceChannels.get(channelName);
    if (channelInfo) {
      const membersArray = Array.from(channelInfo.members.values());
      setOnlineMembers(membersArray);
      setIsConnected(channelInfo.channel.state === 'attached');
    } else {
      setOnlineMembers([]);
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const componentId = componentIdRef.current;

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
          
          channelInfo.stateHandler = (stateChange: AblyChannelStateChange) => {
            const currentChannelInfo = globalThis.activePresenceChannels.get(channelName);
            if (!currentChannelInfo) return;

            if (stateChange.current === 'attached') {
              initializePresenceData(currentChannelInfo.channel, currentChannelInfo);
            }
            // Mettre à jour tous les listeners
            currentChannelInfo.listeners.forEach(id => {
                // Ici, on pourrait utiliser un bus d'événements pour notifier les composants
            });
          };

          channelInfo.presenceHandler = (message: AblyPresenceMessage) => {
            const currentChannelInfo = globalThis.activePresenceChannels.get(channelName);
            if (!currentChannelInfo) return;

            const presenceMember = extractPresenceData(message);
            if (!presenceMember) return;

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
            // Notifier tous les listeners du changement
            currentChannelInfo.listeners.forEach(listenerId => {
                const componentCallback = globalThis.presenceUpdateCallbacks?.get(listenerId);
                if(componentCallback) componentCallback();
            });
          };

          channel.on(channelInfo.stateHandler);
          channel.presence.subscribe(channelInfo.presenceHandler);
          
          if (channel.state !== 'attached' && channel.state !== 'attaching') {
            await channel.attach();
          }
        }
        
        if(!globalThis.presenceUpdateCallbacks) globalThis.presenceUpdateCallbacks = new Map();
        globalThis.presenceUpdateCallbacks.set(componentId, () => updateLocalStateFromGlobal(channelName));

        channelInfo.refCount++;
        channelInfo.listeners.add(componentId);

        updateLocalStateFromGlobal(channelName);

      } catch (err) {
        if (mountedRef.current) {
          setError((err as AblyErrorInfo).message);
        }
      }
    };
    initializePresence();

    return () => {
      mountedRef.current = false;
      const channelNameToCleanup = currentChannelNameRef.current;
      if (channelNameToCleanup) {
        const channelInfo = globalThis.activePresenceChannels.get(channelNameToCleanup);
        if (channelInfo) {
          channelInfo.refCount--;
          channelInfo.listeners.delete(componentId);
          globalThis.presenceUpdateCallbacks?.delete(componentId);
          
          if (channelInfo.refCount === 0) {
            console.log(`🧹 [PRESENCE HOOK] Dernier listener parti, nettoyage du canal global ${channelNameToCleanup}`);
            if(channelInfo.presenceHandler) channelInfo.channel.presence.unsubscribe(channelInfo.presenceHandler);
            if(channelInfo.stateHandler) channelInfo.channel.off(channelInfo.stateHandler);
            if(channelInfo.channel.state === 'attached') channelInfo.channel.detach();
            globalThis.activePresenceChannels.delete(channelNameToCleanup);
          }
        }
      }
    };
}, [channelId, enabled, client, extractPresenceData, updateLocalStateFromGlobal]);


  const enterPresence = useCallback(async (userData: Omit<AblyPresenceMember, 'id'>) => {
    const channel = channelRef.current;
    if (!channel || channel.state !== 'attached' || isEnteringRef.current) {
      console.warn('⚠️ [PRESENCE HOOK] - Impossible d\'entrer en présence: canal pas prêt');
      throw new Error('Canal de présence non disponible');
    }
    
    if (!canUpdatePresence()) {
      console.warn('⏸️ [PRESENCE HOOK] - Rate limiting activé, report de l\'entrée en présence');
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
      
    } catch (err) {
      setError((err as AblyErrorInfo).message);
      throw err;
    } finally {
      isEnteringRef.current = false;
    }
  }, [canUpdatePresence]);
  
  const leavePresence = useCallback(async () => {
    const channel = channelRef.current;
    if (!channel) {
      return;
    }
    
    try {
      await channel.presence.leave();
    } catch (err) {
      console.error('❌ [PRESENCE HOOK] - Erreur de sortie:', err);
    }
  }, []);

  const updatePresence = useCallback(async (userData: Omit<AblyPresenceMember, 'id'>) => {
    const channel = channelRef.current;
    if (!channel || channel.state !== 'attached') {
      console.warn('⚠️ [PRESENCE HOOK] - Impossible de mettre à jour la présence: canal non disponible');
      return;
    }
    
    if (!canUpdatePresence()) {
      console.warn('⏸️ [PRESENCE HOOK] - Rate limiting activé, report de la mise à jour');
      return;
    }
    
    try {
      lastPresenceUpdateRef.current = Date.now();
      await channel.presence.update(userData);
      
    } catch (err) {
      setError((err as AblyErrorInfo).message);
    }
  }, [canUpdatePresence]);

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

// Helper type pour le callback global
declare global {
  var presenceUpdateCallbacks: Map<string, () => void>;
}

// Fonction pour initialiser le callback global si nécessaire
if (typeof globalThis.presenceUpdateCallbacks === 'undefined') {
  globalThis.presenceUpdateCallbacks = new Map();
}


// Fonctions utilitaires pour initialiser les données de présence
async function initializePresenceData(
  targetChannel: AblyChannel,
  targetChannelInfo: {
    refCount: number;
    channel: AblyChannel;
    members: Map<string, AblyPresenceMember>;
    listeners: Set<string>;
    lastPresenceUpdate: number;
  }
) {
  try {
    const members = await targetChannel.presence.get();
    
    if (Array.isArray(members)) {
      targetChannelInfo.members.clear();
      members.forEach((member: AblyPresenceMessage) => {
        // La logique d'extraction est maintenant dans le hook, mais pourrait être partagée
        // Pour l'instant, on assume une structure simple
        const presenceMember = {
          id: member.clientId,
          name: (member.data as any)?.name || member.clientId,
          role: (member.data as any)?.role || Role.ELEVE,
          image: (member.data as any)?.image || null,
          data: (member.data as any)?.data || {}
        } as AblyPresenceMember;
        targetChannelInfo.members.set(member.clientId!, presenceMember);
      });
      // Notifier tous les listeners
      targetChannelInfo.listeners.forEach(listenerId => {
        const componentCallback = globalThis.presenceUpdateCallbacks?.get(listenerId);
        if(componentCallback) componentCallback();
      });
    }
  } catch (err) {
      console.error('❌ [PRESENCE HOOK] - Erreur récupération de la présence:', err);
  }
}
