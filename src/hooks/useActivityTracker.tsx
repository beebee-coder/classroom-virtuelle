// src/hooks/useActivityTracker.tsx
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { pusherClient } from '@/lib/pusher/client';
import type { PresenceChannel, Members } from 'pusher-js';

interface PresenceMember {
  id: string;
  info?: any;
}

interface PusherSubscriptionSucceeded {
  members: Members;
  count: number;
}

interface UseActivityTrackerReturn {
  onlineUsers: string[];
  isConnected: boolean;
  error: string | null;
}

/**
 * Hook personnalisé pour gérer l'abonnement de l'utilisateur
 * à un canal de présence Pusher pour sa classe.
 * @param userId - L'ID de l'utilisateur actuel.
 * @param classroomId - L'ID de la classe de l'utilisateur.
 * @param enabled - Un booléen pour activer ou désactiver le hook.
 */
export const useActivityTracker = (
  userId?: string, 
  classroomId?: string, 
  enabled: boolean = true
): UseActivityTrackerReturn => {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const channelRef = useRef<PresenceChannel | null>(null);
  const isSubscribedRef = useRef(false);
  const previousParamsRef = useRef<{ userId?: string; classroomId?: string; enabled: boolean }>({ enabled: true });

  console.log('🔍 [PRESENCE HOOK DEBUG] - Paramètres reçus:', { userId, classroomId, enabled });

  // Fonction pour nettoyer l'abonnement
  const cleanupSubscription = useCallback((channelName?: string) => {
    if (channelRef.current) {
      try {
        console.log(`🔚 [PRESENCE HOOK] - Nettoyage de l'abonnement pour ${channelName || 'canal inconnu'}`);
        channelRef.current.unbind_all();
        channelRef.current = null;
      } catch (err) {
        console.warn('⚠️ [PRESENCE HOOK] - Erreur lors du nettoyage du canal:', err);
      }
    }
    
    if (channelName) {
      try {
        pusherClient.unsubscribe(channelName);
      } catch (err) {
        console.warn('⚠️ [PRESENCE HOOK] - Erreur lors du désabonnement:', err);
      }
    }
    
    isSubscribedRef.current = false;
    setIsConnected(false);
    setOnlineUsers([]);
  }, []);

  useEffect(() => {
    console.log('🔍 [PRESENCE HOOK DEBUG] - useEffect exécuté avec:', { userId, classroomId, enabled });
    
    const currentParams = { userId, classroomId, enabled };
    const previousParams = previousParamsRef.current;
    
    // Vérifier si les paramètres ont réellement changé
    const paramsChanged = 
      previousParams.userId !== userId ||
      previousParams.classroomId !== classroomId ||
      previousParams.enabled !== enabled;

    previousParamsRef.current = currentParams;

    // Validation des paramètres
    if (!enabled) {
      console.log('🕵️ [PRESENCE HOOK] - Hook désactivé');
      if (isSubscribedRef.current) {
        cleanupSubscription();
      }
      return;
    }

    if (!userId || !classroomId) {
      console.log('❌ [PRESENCE HOOK] - Infos manquantes:', { userId, classroomId });
      setError('Informations utilisateur ou classe manquantes');
      if (isSubscribedRef.current) {
        cleanupSubscription();
      }
      return;
    }

    const channelName = `presence-class-${classroomId}`;

    // Éviter les réinitialisations inutiles si les paramètres sont identiques
    if (isSubscribedRef.current && 
        channelRef.current?.name === channelName && 
        !paramsChanged) {
      console.log('⏭️ [PRESENCE HOOK] - Abonnement déjà actif avec les mêmes paramètres, ignoré');
      return;
    }

    // Nettoyer l'ancien abonnement seulement si les paramètres ont changé
    if (paramsChanged && channelRef.current) {
      const previousChannelName = channelRef.current.name;
      if (previousChannelName !== channelName) {
        cleanupSubscription(previousChannelName);
      }
    }

    console.log(`🕵️ [PRESENCE HOOK] - Tentative d'abonnement au canal: ${channelName} pour l'utilisateur ${userId}`);

    try {
      // Vérifier si Pusher est disponible
      if (!pusherClient) {
        throw new Error('Client Pusher non disponible');
      }

      // Vérifier si on est déjà abonné à ce canal
      const existingChannel = pusherClient.channel(channelName);
      if (existingChannel) {
        console.log('✅ [PRESENCE HOOK] - Déjà abonné au canal, réutilisation');
        channelRef.current = existingChannel as PresenceChannel;
        isSubscribedRef.current = true;
        return;
      }

      // S'abonner au canal
      const channel = pusherClient.subscribe(channelName) as PresenceChannel;
      channelRef.current = channel;
      isSubscribedRef.current = true;
      setError(null);

      // Gérer la souscription réussie
      const handleSubscriptionSucceeded = (data: PusherSubscriptionSucceeded) => {
        console.log(`✅ [PRESENCE HOOK] - Abonnement réussi au canal ${channelName}`);
        setIsConnected(true);
        
        const userList = Object.keys(data.members || {});
        setOnlineUsers(userList);
        console.log(`📊 [PRESENCE HOOK] - Liste initiale des utilisateurs en ligne:`, userList);
      };

      // Gérer l'ajout de membre
      const handleMemberAdded = (member: PresenceMember) => {
        console.log(`➕ [PRESENCE HOOK] - Nouvel utilisateur connecté:`, member.id);
        setOnlineUsers(prev => {
          // Éviter les doublons
          if (prev.includes(member.id)) {
            return prev;
          }
          return [...prev, member.id];
        });
      };

      // Gérer la suppression de membre
      const handleMemberRemoved = (member: PresenceMember) => {
        console.log(`➖ [PRESENCE HOOK] - Utilisateur déconnecté:`, member.id);
        setOnlineUsers(prev => prev.filter(id => id !== member.id));
      };

      // Gérer les erreurs de souscription
      const handleSubscriptionError = (status: any) => {
        console.error(`❌ [PRESENCE HOOK] - Erreur d'abonnement au canal ${channelName}:`, status);
        setError(`Erreur d'abonnement: ${status?.message || 'Erreur inconnue'}`);
        setIsConnected(false);
        isSubscribedRef.current = false;
      };

      // Gérer la déconnexion du canal
      const handleUnsubscribed = () => {
        console.log(`🔌 [PRESENCE HOOK] - Désabonné du canal ${channelName}`);
        setIsConnected(false);
        isSubscribedRef.current = false;
      };

      // Lier les événements
      channel.bind('pusher:subscription_succeeded', handleSubscriptionSucceeded);
      channel.bind('pusher:member_added', handleMemberAdded);
      channel.bind('pusher:member_removed', handleMemberRemoved);
      channel.bind('pusher:subscription_error', handleSubscriptionError);
      channel.bind('pusher:unsubscribed', handleUnsubscribed);

      // Gérer la déconnexion Pusher globale
      const handleDisconnected = () => {
        console.log('🔌 [PRESENCE HOOK] - Déconnecté de Pusher');
        setIsConnected(false);
        setError('Déconnecté du service de présence');
      };

      const handleConnected = () => {
        console.log('🔗 [PRESENCE HOOK] - Reconnecté à Pusher');
        setIsConnected(true);
        setError(null);
      };

      pusherClient.connection.bind('disconnected', handleDisconnected);
      pusherClient.connection.bind('connected', handleConnected);

      // Nettoyage
      return () => {
        console.log(`🔚 [PRESENCE HOOK] - Nettoyage des écouteurs pour ${channelName}`);
        
        // Retirer les écouteurs d'événements
        if (channel) {
          channel.unbind('pusher:subscription_succeeded', handleSubscriptionSucceeded);
          channel.unbind('pusher:member_added', handleMemberAdded);
          channel.unbind('pusher:member_removed', handleMemberRemoved);
          channel.unbind('pusher:subscription_error', handleSubscriptionError);
          channel.unbind('pusher:unsubscribed', handleUnsubscribed);
        }
        
        pusherClient.connection.unbind('disconnected', handleDisconnected);
        pusherClient.connection.unbind('connected', handleConnected);
      };

    } catch (error) {
      console.error(`❌ [PRESENCE HOOK] - Erreur critique lors de la tentative d'abonnement:`, error);
      setError(`Erreur de connexion: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      setIsConnected(false);
      isSubscribedRef.current = false;
    }

    // Cleanup final seulement lors du démontage complet
    return () => {
      // Ne pas nettoyer immédiatement - laisser Pusher gérer la reconnexion
      // Le nettoyage sera géré par le changement de paramètres
    };
  }, [userId, classroomId, enabled, cleanupSubscription]);

  return { 
    onlineUsers, 
    isConnected, 
    error 
  };
};