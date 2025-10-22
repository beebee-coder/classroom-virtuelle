// src/hooks/useActivityTracker.tsx
'use client';

import { useEffect } from 'react';
import { pusherClient } from '@/lib/pusher/client';

/**
 * Hook personnalisé pour gérer l'abonnement de l'utilisateur
 * à un canal de présence Pusher pour sa classe.
 * @param userId - L'ID de l'utilisateur actuel.
 * @param classroomId - L'ID de la classe de l'utilisateur.
 */
export const useActivityTracker = (userId?: string, classroomId?: string) => {
  useEffect(() => {
    // Ne rien faire si les informations nécessaires ne sont pas disponibles
    if (!pusherClient || !userId || !classroomId) {
      console.log('🕵️ [PRESENCE HOOK] - Conditions non remplies, sortie.', { userId, classroomId });
      return;
    }

    const channelName = `presence-class-${classroomId}`;
    console.log(`🕵️ [PRESENCE HOOK] - Tentative d'abonnement au canal: ${channelName} pour l'utilisateur ${userId}`);
    
    // S'abonner au canal. Pusher gère automatiquement la signalisation
    // de la présence de cet utilisateur aux autres membres.
    try {
      const channel = pusherClient.subscribe(channelName);

      channel.bind('pusher:subscription_succeeded', () => {
        console.log(`✅ [PRESENCE HOOK] - Abonnement réussi au canal ${channelName} pour l'utilisateur ${userId}`);
      });
      
      channel.bind('pusher:subscription_error', (status: any) => {
        console.error(`❌ [PRESENCE HOOK] - Erreur d'abonnement au canal ${channelName}:`, status);
      });

      // Se désabonner du canal lorsque le composant est démonté
      // ou que les dépendances changent.
      return () => {
        console.log(`🔚 [PRESENCE HOOK] - Désabonnement du canal ${channelName}`);
        pusherClient.unsubscribe(channelName);
      };
    } catch (error) {
       console.error(`❌ [PRESENCE HOOK] - Erreur lors de la tentative d'abonnement:`, error);
    }
  }, [userId, classroomId]);
};
