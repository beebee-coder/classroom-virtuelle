// src/hooks/usePresenceForTeacher.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { getPusherClient } from '@/lib/pusher/client';
import type { PresenceChannel, Members } from 'pusher-js';

interface UsePresenceForTeacherReturn {
  onlineUsers: string[];
  isConnected: boolean;
  error: string | null;
}

export const usePresenceForTeacher = (
  userId?: string, 
  classroomId?: string, 
  enabled: boolean = true
): UsePresenceForTeacherReturn => {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const channelRef = useRef<PresenceChannel | null>(null);

  useEffect(() => {
    // Validation des paramètres et de l'état "enabled"
    if (!enabled || !userId || !classroomId) {
      if (channelRef.current) {
        const pusherClient = getPusherClient();
        console.log('🔚 [PRESENCE PROF] - Désactivation, nettoyage du canal existant.');
        pusherClient.unsubscribe(channelRef.current.name);
        channelRef.current = null;
        setIsConnected(false);
        setOnlineUsers([]);
      }
      return;
    }

    const pusherClient = getPusherClient();
    const channelName = `presence-class-${classroomId}`;

    // Éviter les doubles abonnements si le canal n'a pas changé
    if (channelRef.current?.name === channelName && isConnected) {
      console.log('⏭️ [PRESENCE PROF] - Déjà abonné et connecté, ignoré.');
      return;
    }

    console.log(`🕵️ [PRESENCE PROF] - Tentative d'abonnement au canal: ${channelName}`);

    try {
      // Nettoyer l'ancien canal avant de s'abonner à un nouveau
      if (channelRef.current) {
        pusherClient.unsubscribe(channelRef.current.name);
      }
      
      const channel = pusherClient.subscribe(channelName) as PresenceChannel;
      channelRef.current = channel;

      const handleSubscriptionSucceeded = (data: { members: Members }) => {
        console.log(`✅ [PRESENCE PROF] - Abonnement réussi au canal ${channelName}`);
        setIsConnected(true);
        setError(null);
        
        const userList = Object.keys(data.members || {});
        const otherUsers = userList.filter(id => id !== userId);
        setOnlineUsers(otherUsers);
        console.log(`📊 [PRESENCE PROF] - Élèves actuellement en ligne:`, otherUsers);
      };

      const handleMemberAdded = (member: { id: string }) => {
        if (member.id !== userId) {
          console.log(`➕ [PRESENCE PROF] - Nouvel élève connecté:`, member.id);
          setOnlineUsers(prev => {
            if (!prev.includes(member.id)) {
              return [...prev, member.id];
            }
            return prev;
          });
        }
      };

      const handleMemberRemoved = (member: { id: string }) => {
        console.log(`➖ [PRESENCE PROF] - Élève déconnecté:`, member.id);
        setOnlineUsers(prev => prev.filter(id => id !== member.id));
      };

      const handleSubscriptionError = (status: any) => {
        console.error(`❌ [PRESENCE PROF] - Erreur d'abonnement au canal ${channelName}:`, status);
        setError('Erreur de connexion au service de présence');
        setIsConnected(false);
      };

      // Lier les événements
      channel.bind('pusher:subscription_succeeded', handleSubscriptionSucceeded);
      channel.bind('pusher:member_added', handleMemberAdded);
      channel.bind('pusher:member_removed', handleMemberRemoved);
      channel.bind('pusher:subscription_error', handleSubscriptionError);

      return () => {
        console.log(`🔚 [PRESENCE PROF] - Nettoyage des écouteurs et désabonnement du canal ${channelName}`);
        if (channelRef.current) {
          // Utiliser un try-catch pour le nettoyage car les unbind peuvent échouer si le canal est déjà fermé
          try {
            channelRef.current.unbind_all();
            pusherClient.unsubscribe(channelName);
          } catch(e) {
            console.warn(`⚠️ [PRESENCE PROF] - Avertissement lors du nettoyage du canal ${channelName}:`, e)
          }
          channelRef.current = null;
        }
      };

    } catch (err) {
      console.error('💥 [PRESENCE PROF] - Erreur critique lors de l\'initialisation de Pusher:', err);
      setError('Erreur critique de connexion');
      setIsConnected(false);
    }
  }, [userId, classroomId, enabled, isConnected]); // isConnected ajouté pour retenter la connexion si elle échoue

  return { 
    onlineUsers, 
    isConnected, 
    error 
  };
};
