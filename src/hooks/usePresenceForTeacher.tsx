// src/hooks/usePresenceForTeacher.tsx
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { pusherClient } from '@/lib/pusher/client';
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
  const isSubscribedRef = useRef(false);

  const cleanupSubscription = useCallback((channelName?: string) => {
    if (channelRef.current) {
      try {
        channelRef.current.unbind_all();
        channelRef.current = null;
      } catch (err) {
        console.warn('Erreur lors du nettoyage du canal:', err);
      }
    }
    
    if (channelName) {
      try {
        pusherClient.unsubscribe(channelName);
      } catch (err) {
        console.warn('Erreur lors du désabonnement:', err);
      }
    }
    
    isSubscribedRef.current = false;
    setIsConnected(false);
    setOnlineUsers([]);
  }, []);

  useEffect(() => {
    if (!enabled || !userId || !classroomId) {
      cleanupSubscription();
      return;
    }

    const channelName = `presence-class-${classroomId}`;

    if (isSubscribedRef.current && channelRef.current?.name === channelName) {
      return;
    }

    try {
      const channel = pusherClient.subscribe(channelName) as PresenceChannel;
      channelRef.current = channel;
      isSubscribedRef.current = true;
      setError(null);

      channel.bind('pusher:subscription_succeeded', (data: { members: Members }) => {
        setIsConnected(true);
        const userList = Object.keys(data.members || {});
        setOnlineUsers(userList);
      });

      channel.bind('pusher:member_added', (member: { id: string }) => {
        setOnlineUsers(prev => [...prev.filter(id => id !== member.id), member.id]);
      });

      channel.bind('pusher:member_removed', (member: { id: string }) => {
        setOnlineUsers(prev => prev.filter(id => id !== member.id));
      });

      channel.bind('pusher:subscription_error', (status: any) => {
        setError(`Erreur d'abonnement: ${status?.message || 'Erreur inconnue'}`);
        setIsConnected(false);
      });

      return () => {
        if (channel) {
          channel.unbind_all();
        }
      };

    } catch (error) {
      setError(`Erreur de connexion: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      setIsConnected(false);
    }
  }, [userId, classroomId, enabled, cleanupSubscription]);

  return { 
    onlineUsers, 
    isConnected, 
    error 
  };
};
