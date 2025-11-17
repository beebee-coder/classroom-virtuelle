// src/hooks/useAblyPresence.ts - CORRECTION
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAbly } from './useAbly';
import type { AblyPresenceMember } from '@/lib/ably/types';
import { getClassChannelName } from '@/lib/ably/channels';
import Ably from 'ably';
import { Role } from '@prisma/client'; // CORRECTION: Importer le type Role

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

  // CORRECTION: Fonction améliorée pour extraire les données de présence
  const extractPresenceData = useCallback((message: AblyPresenceMessage): AblyPresenceMember | null => {
    if (!message.clientId) return null;

    // CORRECTION: Gérer différents formats de données de présence
    let presenceData: Omit<AblyPresenceMember, 'id'>;
    
    if (typeof message.data === 'object' && message.data !== null) {
      // Cas 1: Données structurées (format attendu)
      presenceData = { ...message.data } as Omit<AblyPresenceMember, 'id'>;
    } else if (typeof message.data === 'string') {
      // Cas 2: Données en string JSON (fallback)
      try {
        presenceData = JSON.parse(message.data);
      } catch {
        // CORRECTION: Utiliser Role.ELEVE comme valeur par défaut au lieu de 'unknown'
        presenceData = { 
          name: message.data, 
          role: Role.ELEVE, // CORRECTION: Valeur par défaut valide
        };
      }
    } else {
      // Cas 3: Format inconnu, créer des données par défaut
      // CORRECTION: Utiliser Role.ELEVE comme valeur par défaut au lieu de 'unknown'
      presenceData = { 
        name: `User ${message.clientId}`, 
        role: Role.ELEVE, // CORRECTION: Valeur par défaut valide
        data: {
          userId: message.clientId.startsWith('cmi') ? message.clientId : undefined
        }
      };
    }

    // CORRECTION: Validation et fallback du rôle
    if (!isValidRole(presenceData.role)) {
      console.warn(`⚠️ [PRESENCE HOOK] - Rôle invalide: ${presenceData.role}, utilisation de ELEVE par défaut`);
      presenceData.role = Role.ELEVE;
    }

    return {
      id: message.clientId,
      ...presenceData
    };
  }, []);

  // CORRECTION: Fonction utilitaire pour valider les rôles
  const isValidRole = useCallback((role: any): role is Role => {
    return Object.values(Role).includes(role);
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
      const presenceMember = extractPresenceData(message);

      if (!presenceMember) {
        console.warn(`⚠️ [PRESENCE HOOK] - Impossible d'extraire les données de présence pour ${message.clientId}`);
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
              const presenceMember = extractPresenceData(member);
              if (presenceMember) {
                channelInfo!.members.set(member.clientId!, presenceMember);
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
  }, [updateOnlineMembers, extractPresenceData]);

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
      console.log(`➡️ [PRESENCE HOOK] - Entrée en présence pour: ${client?.auth.clientId}`, userData);
      // CORRECTION: S'assurer que les données sont bien formatées pour Ably
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