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
    
    // Validation des paramètres
    if (!enabled) {
      console.log('🕵️ [PRESENCE HOOK] - Hook désactivé');
      cleanupSubscription();
      return;
    }

    if (!userId || !classroomId) {
      console.log('❌ [PRESENCE HOOK] - Infos manquantes:', { userId, classroomId });
      setError('Informations utilisateur ou classe manquantes');
      cleanupSubscription();
      return;
    }

    // Nettoyer l'ancien abonnement si les paramètres changent
    const previousChannelName = channelRef.current?.name;
    if (previousChannelName && previousChannelName !== `presence-class-${classroomId}`) {
      cleanupSubscription(previousChannelName);
    }

    // Éviter les abonnements en double
    if (isSubscribedRef.current && channelRef.current?.name === `presence-class-${classroomId}`) {
      console.log('⏭️ [PRESENCE HOOK] - Abonnement déjà actif, ignoré');
      return;
    }

    const channelName = `presence-class-${classroomId}`;
    console.log(`🕵️ [PRESENCE HOOK] - Tentative d'abonnement au canal: ${channelName} pour l'utilisateur ${userId}`);

    try {
      // Vérifier si Pusher est disponible
      if (!pusherClient) {
        throw new Error('Client Pusher non disponible');
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
      };

      // Lier les événements
      channel.bind('pusher:subscription_succeeded', handleSubscriptionSucceeded);
      channel.bind('pusher:member_added', handleMemberAdded);
      channel.bind('pusher:member_removed', handleMemberRemoved);
      channel.bind('pusher:subscription_error', handleSubscriptionError);

      // Gérer la déconnexion Pusher
      const handleDisconnected = () => {
        console.log('🔌 [PRESENCE HOOK] - Déconnecté de Pusher');
        setIsConnected(false);
        setError('Déconnecté du service de présence');
      };

      pusherClient.connection.bind('disconnected', handleDisconnected);

      // Nettoyage
      return () => {
        console.log(`🔚 [PRESENCE HOOK] - Nettoyage des écouteurs pour ${channelName}`);
        
        // Retirer les écouteurs d'événements
        if (channel) {
          channel.unbind('pusher:subscription_succeeded', handleSubscriptionSucceeded);
          channel.unbind('pusher:member_added', handleMemberAdded);
          channel.unbind('pusher:member_removed', handleMemberRemoved);
          channel.unbind('pusher:subscription_error', handleSubscriptionError);
        }
        
        pusherClient.connection.unbind('disconnected', handleDisconnected);
        
        // Ne pas désabonner immédiatement pour éviter les flickers
        // Le désabonnement sera géré par le cleanup suivant
      };

    } catch (error) {
      console.error(`❌ [PRESENCE HOOK] - Erreur critique lors de la tentative d'abonnement:`, error);
      setError(`Erreur de connexion: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      setIsConnected(false);
      isSubscribedRef.current = false;
    }

    // Cleanup final lors du démontage ou changement de dépendances
    return () => {
      // Nettoyage différé pour éviter les désabonnements/reabonnements rapides
      const timeoutId = setTimeout(() => {
        if (!enabled || !userId || !classroomId) {
          cleanupSubscription(channelName);
        }
      }, 1000);

      return () => clearTimeout(timeoutId);
    };
  }, [userId, classroomId, enabled, cleanupSubscription]);

  return { 
    onlineUsers, 
    isConnected, 
    error 
  };
};