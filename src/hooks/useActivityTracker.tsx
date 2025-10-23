// src/hooks/useActivityTracker.tsx
'use client';

import { useEffect, useState } from 'react';
import { pusherClient } from '@/lib/pusher/client';

/**
 * Hook personnalisé pour gérer l'abonnement de l'utilisateur
 * à un canal de présence Pusher pour sa classe.
 * @param userId - L'ID de l'utilisateur actuel.
 * @param classroomId - L'ID de la classe de l'utilisateur.
 */
export const useActivityTracker = (userId?: string, classroomId?: string) => {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!userId || !classroomId) {
      console.log('🕵️ [PRESENCE HOOK] - Conditions non remplies pour l\'abonnement.', { userId, classroomId });
      return;
    }

    const channelName = `presence-class-${classroomId}`;
    console.log(`🕵️ [PRESENCE HOOK] - Tentative d'abonnement au canal: ${channelName} pour l'utilisateur ${userId}`);
    
    try {
      const channel = pusherClient.subscribe(channelName);

      channel.bind('pusher:subscription_succeeded', (members: any) => {
        console.log(`✅ [PRESENCE HOOK] - Abonnement réussi au canal ${channelName}`);
        
        const userList = Object.keys(members.members || {});
        setOnlineUsers(userList);
        console.log(`📊 [PRESENCE HOOK] - Liste initiale des utilisateurs en ligne:`, userList);
      });
      
      channel.bind('pusher:member_added', (member: any) => {
        console.log(`➕ [PRESENCE HOOK] - Nouvel utilisateur connecté:`, member.id);
        setOnlineUsers(prev => [...prev.filter(id => id !== member.id), member.id]);
      });

      channel.bind('pusher:member_removed', (member: any) => {
        console.log(`➖ [PRESENCE HOOK] - Utilisateur déconnecté:`, member.id);
        setOnlineUsers(prev => prev.filter(id => id !== member.id));
      });
      
      channel.bind('pusher:subscription_error', (status: any) => {
        console.error(`❌ [PRESENCE HOOK] - Erreur d'abonnement au canal ${channelName}:`, status);
      });

      // Se désabonner du canal lorsque le composant est démonté
      return () => {
        console.log(`🔚 [PRESENCE HOOK] - Désabonnement du canal ${channelName}`);
        pusherClient.unsubscribe(channelName);
      };
    } catch (error) {
      console.error(`❌ [PRESENCE HOOK] - Erreur lors de la tentative d'abonnement:`, error);
    }
  }, [userId, classroomId]);

  return { onlineUsers };
};
