// src/hooks/useActivityTracker.tsx
'use client';

import { useEffect, useState } from 'react';
import { pusherClient } from '@/lib/pusher/client';
import type { PresenceChannel } from 'pusher-js';

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
      console.log('🕵️ [PRESENCE ÉLÈVE] - Conditions non remplies pour l\'abonnement.', { userId, classroomId });
      return;
    }

    const channelName = `presence-class-${classroomId}`;
    console.log(`🕵️ [PRESENCE ÉLÈVE] - Tentative d'abonnement au canal: ${channelName} pour l'utilisateur ${userId}`);
    
    let channel: PresenceChannel;
    try {
      channel = pusherClient.subscribe(channelName) as PresenceChannel;

      channel.bind('pusher:subscription_succeeded', (members: any) => {
        console.log(`✅ [PRESENCE ÉLÈVE] - Abonnement réussi au canal ${channelName}`);
        
        const userList = Object.keys(members.members || {});
        setOnlineUsers(userList);
        console.log(`📊 [PRESENCE ÉLÈVE] - Liste initiale des utilisateurs en ligne:`, userList);
      });
      
      channel.bind('pusher:member_added', (member: { id: string }) => {
        console.log(`➕ [PRESENCE ÉLÈVE] - Nouvel utilisateur connecté:`, member.id);
        setOnlineUsers(prev => [...prev.filter(id => id !== member.id), member.id]);
      });

      channel.bind('pusher:member_removed', (member: { id: string }) => {
        console.log(`➖ [PRESENCE ÉLÈVE] - Utilisateur déconnecté:`, member.id);
        setOnlineUsers(prev => prev.filter(id => id !== member.id));
      });
      
      channel.bind('pusher:subscription_error', (status: any) => {
        console.error(`❌ [PRESENCE ÉLÈVE] - Erreur d'abonnement au canal ${channelName}:`, status);
      });

    } catch (error) {
      console.error(`❌ [PRESENCE ÉLÈVE] - Erreur critique lors de la tentative d'abonnement:`, error);
    }

    // Se désabonner du canal lorsque le composant est démonté
    return () => {
        if (channel) {
            console.log(`🔚 [PRESENCE ÉLÈVE] - Désabonnement du canal ${channelName}`);
            pusherClient.unsubscribe(channelName);
        }
    };
  }, [userId, classroomId]);

  return { onlineUsers };
};
