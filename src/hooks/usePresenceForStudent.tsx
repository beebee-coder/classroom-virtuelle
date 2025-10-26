// src/hooks/usePresenceForStudent.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { pusherClient } from '@/lib/pusher/client';
import type { PresenceChannel } from 'pusher-js';

interface UsePresenceForStudentReturn {
  isConnected: boolean;
  error: string | null;
  teacherOnline: boolean;
}

export const usePresenceForStudent = (
  userId?: string,
  classroomId?: string,
  enabled: boolean = true
): UsePresenceForStudentReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teacherOnline, setTeacherOnline] = useState(false);
  
  const channelRef = useRef<PresenceChannel | null>(null);

  useEffect(() => {
    // Validation des paramètres et de l'état "enabled"
    if (!enabled || !userId || !classroomId) {
      if (channelRef.current) {
        console.log('🔚 [PRESENCE ELEVE] - Désactivation, nettoyage du canal existant.');
        pusherClient.unsubscribe(channelRef.current.name);
        channelRef.current = null;
        setIsConnected(false);
        setTeacherOnline(false);
      }
      return;
    }

    const channelName = `presence-class-${classroomId}`;

    // Éviter les doubles abonnements si le canal n'a pas changé
    if (channelRef.current?.name === channelName && isConnected) {
      console.log('⏭️ [PRESENCE ELEVE] - Déjà abonné et connecté, ignoré.');
      return;
    }

    console.log(`🕵️ [PRESENCE ELEVE] - Tentative d'abonnement au canal: ${channelName}`);

    try {
      // Nettoyer l'ancien canal avant de s'abonner à un nouveau
      if (channelRef.current) {
        pusherClient.unsubscribe(channelRef.current.name);
      }
      
      const channel = pusherClient.subscribe(channelName) as PresenceChannel;
      channelRef.current = channel;

      const handleSubscriptionSucceeded = (data: { members: any }) => {
        console.log(`✅ [PRESENCE ELEVE] - Abonnement réussi au canal ${channelName}`);
        setIsConnected(true);
        setError(null);
        
        // Vérifier si le professeur est en ligne
        const members = data.members || {};
        const memberIds = Object.keys(members);
        const hasTeacher = memberIds.some(id => 
          members[id]?.role === 'PROFESSEUR' || id !== userId
        );
        
        setTeacherOnline(hasTeacher);
        console.log(`👨‍🏫 [PRESENCE ELEVE] - Professeur en ligne: ${hasTeacher}`, memberIds);
      };

      const handleMemberAdded = (member: { id: string; info?: any }) => {
        console.log(`➕ [PRESENCE ELEVE] - Nouveau membre connecté:`, member.id);
        
        // Si le membre ajouté n'est pas l'élève actuel, c'est probablement le professeur
        if (member.id !== userId) {
          setTeacherOnline(true);
          console.log('👨‍🏫 [PRESENCE ELEVE] - Professeur détecté en ligne');
        }
      };

      const handleMemberRemoved = (member: { id: string }) => {
        console.log(`➖ [PRESENCE ELEVE] - Membre déconnecté:`, member.id);
        
        // Si le membre déconnecté n'est pas l'élève actuel, vérifier s'il reste d'autres membres
        if (member.id !== userId) {
          // On suppose que c'était le professeur qui s'est déconnecté
          setTeacherOnline(false);
          console.log('👨‍🏫 [PRESENCE ELEVE] - Professeur déconnecté');
        }
      };

      const handleSubscriptionError = (status: any) => {
        console.error(`❌ [PRESENCE ELEVE] - Erreur d'abonnement au canal ${channelName}:`, status);
        setError('Erreur de connexion au service de présence');
        setIsConnected(false);
        setTeacherOnline(false);
      };

      // Lier les événements
      channel.bind('pusher:subscription_succeeded', handleSubscriptionSucceeded);
      channel.bind('pusher:member_added', handleMemberAdded);
      channel.bind('pusher:member_removed', handleMemberRemoved);
      channel.bind('pusher:subscription_error', handleSubscriptionError);

      return () => {
        console.log(`🔚 [PRESENCE ELEVE] - Nettoyage des écouteurs et désabonnement du canal ${channelName}`);
        if (channelRef.current) {
          try {
            channelRef.current.unbind_all();
            pusherClient.unsubscribe(channelName);
          } catch(e) {
            console.warn(`⚠️ [PRESENCE ELEVE] - Avertissement lors du nettoyage du canal ${channelName}:`, e);
          }
          channelRef.current = null;
        }
        setIsConnected(false);
        setTeacherOnline(false);
      };

    } catch (err) {
      console.error('💥 [PRESENCE ELEVE] - Erreur critique lors de l\'initialisation de Pusher:', err);
      setError('Erreur critique de connexion');
      setIsConnected(false);
      setTeacherOnline(false);
    }
  }, [userId, classroomId, enabled]);

  return { 
    isConnected, 
    error,
    teacherOnline 
  };
};
