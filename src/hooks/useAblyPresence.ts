// src/hooks/useAblyPresence.ts - VERSION CORRIGÉE POUR STABILITÉ
'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useAbly } from './useAbly';
import type { AblyPresenceMember } from '@/lib/ably/types';
import { getClassChannelName } from '@/lib/ably/channels';
import Ably from 'ably';
import { Role } from '@prisma/client';

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
    listeners: Set<string>;
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
  const handlersRef = useRef<{ stateHandler: any; onPresenceUpdate: any } | null>(null);

  const isLoading = useMemo(() => 
    connectionState === 'initialized' || connectionState === 'connecting', 
    [connectionState]
  );

  // ✅ CORRECTION : Fonction utilitaire pour valider les rôles
  const isValidRole = useCallback((role: any): role is Role => {
    return Object.values(Role).includes(role);
  }, []);

  // ✅ CORRECTION : Fonction améliorée pour extraire les données de présence
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

  // ✅ CORRECTION : Mise à jour des membres en ligne avec mémoisation
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

  // ✅ CORRECTION : Gestion robuste du compteur de références
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
              // ✅ CORRECTION : Nettoyage sécurisé des handlers
              if (handlersRef.current) {
                currentChannelInfo.channel.off(handlersRef.current.stateHandler);
                currentChannelInfo.channel.presence.unsubscribe(handlersRef.current.onPresenceUpdate);
                handlersRef.current = null;
              }
              currentChannelInfo.channel.detach();
            } catch (error) {
              console.warn('⚠️ [PRESENCE HOOK] - Erreur lors du détachement du canal:', error);
            }
            globalThis.activePresenceChannels.delete(channelName);
          }
        }, 10000); // ✅ CORRECTION : Délai augmenté pour éviter les reconnexions fréquentes
      }
    }
  }, []);

  // ✅ CORRECTION : Configuration des handlers avec gestion de mémoire
  const setupPresenceHandlers = useCallback((channel: AblyChannel, channelName: string) => {
    if (!mountedRef.current) return;

    const channelInfo = globalThis.activePresenceChannels.get(channelName);
    if (!channelInfo) return;

    // ✅ CORRECTION : Nettoyer les handlers existants
    if (handlersRef.current) {
      channel.off(handlersRef.current.stateHandler);
      channel.presence.unsubscribe(handlersRef.current.onPresenceUpdate);
    }

    const stateHandler = (stateChange: AblyChannelStateChange) => {
      if (!mountedRef.current) return;
      
      console.log(`🔌 [PRESENCE HOOK] - État du canal: ${stateChange.previous} → ${stateChange.current} pour ${channelName}`);
      
      if (stateChange.current === 'attached') {
        setIsConnected(true);
        setError(null);
        
        // ✅ CORRECTION : Initialisation différée sécurisée
        setTimeout(() => {
          if (mountedRef.current && channel.state === 'attached') {
            initializePresence(channel, channelInfo);
          }
        }, 500);
      } else if (['detached', 'failed', 'suspended'].includes(stateChange.current)) {
        setIsConnected(false);
        if (stateChange.reason) {
          setError(stateChange.reason);
          console.error(`❌ [PRESENCE HOOK] - Erreur de canal ${channelName}:`, stateChange.reason);
        }
      }
    };

    const onPresenceUpdate = (message: AblyPresenceMessage) => {
      if (!mountedRef.current) return;

      const currentMembers = channelInfo.members;
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
      
      updateOnlineMembers();
    };

    channel.on(stateHandler);
    channel.presence.subscribe(onPresenceUpdate);

    // ✅ CORRECTION : Stocker les handlers pour nettoyage
    handlersRef.current = { stateHandler, onPresenceUpdate };

    const initializePresence = (targetChannel: AblyChannel, targetChannelInfo: typeof channelInfo) => {
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

    if (channel.state === 'attached') {
      initializePresence(channel, channelInfo);
    }

    return { stateHandler, onPresenceUpdate };
  }, [updateOnlineMembers, extractPresenceData]);

  // ✅ CORRECTION : Effet principal simplifié et sécurisé
  useEffect(() => {
    mountedRef.current = true;

    if (!enabled || !channelId || !client) {
      return;
    }

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
          
          channelInfo = { 
            refCount: 0, 
            channel, 
            members: new Map(),
            listeners: new Set()
          };
          globalThis.activePresenceChannels.set(channelName, channelInfo);
          
          setupPresenceHandlers(channel, channelName);
          
          if (channel.state !== 'attached' && channel.state !== 'attaching') {
            await channel.attach();
          }
        } else {
          console.log(`🔁 [PRESENCE HOOK] - Réutilisation canal global: ${channelName}`);
          channelRef.current = channelInfo.channel;
          
          if (channelInfo.channel.state === 'attached') {
            setIsConnected(true);
            updateOnlineMembers();
          }
        }

        manageChannelRefCount(channelName, true);

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
        console.log(`🧹 [PRESENCE HOOK] - Nettoyage pour canal: ${channelNameToCleanup}`);
        manageChannelRefCount(channelNameToCleanup, false);
        channelRef.current = null;
        currentChannelNameRef.current = null;
      }
    };
  }, [channelId, enabled, client, manageChannelRefCount, setupPresenceHandlers, updateOnlineMembers]);

  // ✅ CORRECTION : Fonctions de présence avec gestion d'état améliorée
  const enterPresence = useCallback(async (userData: Omit<AblyPresenceMember, 'id'>) => {
    const channel = channelRef.current;
    if (!channel || !isConnected || isEnteringRef.current) {
      console.warn('⚠️ [PRESENCE HOOK] - Impossible d\'entrer en présence: canal pas prêt');
      throw new Error('Canal de présence non disponible');
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
      
      await channel.presence.enter(presenceData);
    } catch (err) {
      console.error('❌ [PRESENCE HOOK] - Erreur d\'entrée en présence:', err);
      setError(err as AblyErrorInfo);
      throw err;
    } finally {
      isEnteringRef.current = false;
    }
  }, [client?.auth.clientId, isConnected]);
  
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
    
    try {
      await channel.presence.update(userData);
    } catch (err) {
      console.error('❌ [PRESENCE HOOK] - Erreur de mise à jour:', err);
      setError(err as AblyErrorInfo);
    }
  }, [isConnected]);

  // ✅ CORRECTION : Effets de synchronisation simplifiés
  useEffect(() => {
    if (connectionError) {
      setError(connectionError);
      setIsConnected(false);
    }
  }, [connectionError]);

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