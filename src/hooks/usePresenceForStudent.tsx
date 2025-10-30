// src/hooks/usePresenceForStudent.tsx
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
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
  const hasLoggedRef = useRef(false);
  
  const handlersRef = useRef<{
    subscriptionSucceeded?: (data: any) => void;
    memberAdded?: (member: any) => void;
    memberRemoved?: (member: any) => void;
    subscriptionError?: (status: any) => void;
  }>({});

  useEffect(() => {
    if (enabled && userId && classroomId && !hasLoggedRef.current) {
      console.log(`🕵️ [PRESENCE ELEVE] - Initialisation pour l'élève ${userId} dans la classe ${classroomId}`);
      hasLoggedRef.current = true;
    }
  }, [enabled, userId, classroomId]);
  
  const cleanupChannel = useCallback((channelName: string) => {
    
    if (channelRef.current) {
      try {
        const handlers = handlersRef.current;
        if (handlers.subscriptionSucceeded) {
          channelRef.current.unbind('pusher:subscription_succeeded', handlers.subscriptionSucceeded);
        }
        if (handlers.memberAdded) {
          channelRef.current.unbind('pusher:member_added', handlers.memberAdded);
        }
        if (handlers.memberRemoved) {
          channelRef.current.unbind('pusher:member_removed', handlers.memberRemoved);
        }
        if (handlers.subscriptionError) {
          channelRef.current.unbind('pusher:subscription_error', handlers.subscriptionError);
        }
        
        handlersRef.current = {};
        
        pusherClient.unsubscribe(channelName);
      } catch(e) {
        console.warn(`⚠️ [PRESENCE ELEVE] - Avertissement lors du nettoyage du canal ${channelName}:`, e);
      }
      channelRef.current = null;
    }
    
    setIsConnected(false);
    setTeacherOnline(false);
  }, []);

  useEffect(() => {
    if (!enabled || !userId || !classroomId) {
      if (channelRef.current) {
        cleanupChannel(channelRef.current.name);
      }
      return;
    }

    const channelName = `presence-class-${classroomId}`;

    if (channelRef.current?.name === channelName && isConnected) {
      console.log('⏭️ [PRESENCE ELEVE] - Déjà abonné et connecté, ignoré.');
      return;
    }

    console.log(`🕵️ [PRESENCE ELEVE] - Tentative d'abonnement au canal: ${channelName}`);

    try {
      if (channelRef.current) {
        cleanupChannel(channelRef.current.name);
      }
      
      const channel = pusherClient.subscribe(channelName) as PresenceChannel;
      channelRef.current = channel;

      const handleSubscriptionSucceeded = (data: { members: any }) => {
        console.log(`✅ [PRESENCE ELEVE] - Abonnement réussi au canal ${channelName}`);
        setIsConnected(true);
        setError(null);
        
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
        
        if (member.id !== userId) {
          setTeacherOnline(true);
          console.log('👨‍🏫 [PRESENCE ELEVE] - Professeur détecté en ligne');
        }
      };

      const handleMemberRemoved = (member: { id: string }) => {
        console.log(`➖ [PRESENCE ELEVE] - Membre déconnecté:`, member.id);
        
        if (member.id !== userId) {
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

      handlersRef.current = {
        subscriptionSucceeded: handleSubscriptionSucceeded,
        memberAdded: handleMemberAdded,
        memberRemoved: handleMemberRemoved,
        subscriptionError: handleSubscriptionError
      };

      channel.bind('pusher:subscription_succeeded', handleSubscriptionSucceeded);
      channel.bind('pusher:member_added', handleMemberAdded);
      channel.bind('pusher:member_removed', handleMemberRemoved);
      channel.bind('pusher:subscription_error', handleSubscriptionError);

      return () => {
        cleanupChannel(channelName);
      };

    } catch (err) {
      console.error('💥 [PRESENCE ELEVE] - Erreur critique lors de l\'initialisation de Pusher:', err);
      setError('Erreur critique de connexion');
      setIsConnected(false);
      setTeacherOnline(false);
    }
  }, [userId, classroomId, enabled, cleanupChannel, isConnected]);

  return { 
    isConnected, 
    error,
    teacherOnline 
  };
};
