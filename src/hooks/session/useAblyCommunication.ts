// src/hooks/session/useAblyCommunication.ts - VERSION CORRIGÉE SANS ERREURS TS
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAbly } from '@/hooks/useAbly';
import { getSessionChannelName } from '@/lib/ably/channels';
import { AblyEvents } from '@/lib/ably/events';
import { ComprehensionLevel, WhiteboardOperation } from '@/types';
import type { Types as AblyTypes } from 'ably';
import { useToast } from '../use-toast';
import { useRouter } from 'next/navigation';

const validateTimerDuration = (duration: unknown): number => {
  if (typeof duration !== 'number' || isNaN(duration) || duration <= 0) {
    return 3600;
  }
  return duration;
};

const validateActiveTool = (tool: string): string => {
  const validTools = ['camera', 'whiteboard', 'document', 'screen', 'chat', 'participants', 'quiz', 'breakout'];
  if (validTools.includes(tool)) {
    return tool;
  }
  return 'camera';
};

interface AblyCommunicationProps {
  sessionId: string;
  currentUserId: string;
  initialTeacherId: string;
  onSessionEnded?: () => void;
  onSignalReceived: (fromUserId: string, signal: any) => void;
}

export function useAblyCommunication({ 
  sessionId, 
  currentUserId,
  initialTeacherId,
  onSessionEnded,
  onSignalReceived
}: AblyCommunicationProps) {
  const { client: ablyClient, isConnected: isAblyConnected } = useAbly();
  const { toast } = useToast();
  const router = useRouter();

  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [spotlightedParticipantId, setSpotlightedParticipantId] = useState<string | null>(initialTeacherId);
  const [handRaiseQueue, setHandRaiseQueue] = useState<string[]>([]);
  const [understandingStatus, setUnderstandingStatus] = useState<Map<string, ComprehensionLevel>>(new Map());
  const [activeTool, setActiveTool] = useState<string>('camera');
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [whiteboardControllerId, setWhiteboardControllerId] = useState<string | null>(initialTeacherId);
  const [whiteboardOperations, setWhiteboardOperations] = useState<WhiteboardOperation[]>([]);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerTimeLeft, setTimerTimeLeft] = useState<number>(3600);

  const channelRef = useRef<AblyTypes.RealtimeChannelCallbacks | null>(null);
  const isMountedRef = useRef(true);

  // Handler pour les signaux WebRTC
  const handleSignalEvent = useCallback((message: AblyTypes.Message) => {
    if (!isMountedRef.current) return;
    
    const data = message.data;
    
    if (data.target !== currentUserId) {
      return;
    }
    
    onSignalReceived(data.userId, data.signal);
  }, [currentUserId, onSignalReceived]);

  // Handlers existants
  const handlePresenceUpdate = useCallback(() => {
    if (!channelRef.current || !isMountedRef.current) return;
    
    channelRef.current.presence.get((err, members) => {
      if (err || !isMountedRef.current) return;
      
      if (members && Array.isArray(members)) {
        const uniqueMembers = members
          .map(m => m.clientId)
          .filter((id): id is string => !!id && id !== currentUserId);
        
        const deduplicatedMembers = Array.from(new Set(uniqueMembers));
        setOnlineUserIds(deduplicatedMembers);
      } else {
        setOnlineUserIds([]);
      }
    });
  }, [currentUserId]);
  
  const handleSessionEndedEvent = useCallback(() => {
    if (!isMountedRef.current) return;
    toast({ 
      title: 'Session terminée', 
      description: 'Le professeur a mis fin à la session.' 
    });
    if (onSessionEnded) {
      onSessionEnded();
    }
  }, [toast, onSessionEnded]);

  const handleSpotlightEvent = useCallback((message: AblyTypes.Message) => {
    if (isMountedRef.current) {
      setSpotlightedParticipantId(message.data.participantId);
    }
  }, []);

  const handleHandRaiseUpdateEvent = useCallback((message: AblyTypes.Message) => {
    if (!isMountedRef.current) return;
    const { userId, isRaised } = message.data;
    
    setHandRaiseQueue(prev => {
      const newQueue = prev.filter(id => id !== userId);
      if (isRaised) {
        newQueue.push(userId);
      }
      return newQueue;
    });
  }, []);

  const handleHandAcknowledgedEvent = useCallback((message: AblyTypes.Message) => {
    if (isMountedRef.current) {
      setHandRaiseQueue(prev => prev.filter(id => id !== message.data.userId));
    }
  }, []);
  
  const handleUnderstandingUpdateEvent = useCallback((message: AblyTypes.Message) => {
    if (isMountedRef.current) {
      setUnderstandingStatus(prev => new Map(prev).set(message.data.userId, message.data.status));
    }
  }, []);

  const handleActiveToolChangeEvent = useCallback((message: AblyTypes.Message) => {
    if (isMountedRef.current) {
      const validatedTool = validateActiveTool(message.data.tool);
      setActiveTool(validatedTool);
    }
  }, []);

  const handleDocumentSharedEvent = useCallback((message: AblyTypes.Message) => {
    if (isMountedRef.current && message.data.sharedByUserId !== currentUserId) {
      setDocumentUrl(message.data.url);
      setActiveTool('document');
      
      toast({
        title: 'Document partagé',
        description: `${message.data.sharedBy} a partagé un nouveau document.`
      });
    }
  }, [currentUserId, toast]);

  const handleWhiteboardControllerUpdateEvent = useCallback((message: AblyTypes.Message) => {
    if (isMountedRef.current) {
      setWhiteboardControllerId(message.data.controllerId);
    }
  }, []);

  const handleWhiteboardOperationsEvent = useCallback((message: AblyTypes.Message) => {
    if (isMountedRef.current && message.data.userId !== currentUserId) {
      setWhiteboardOperations(prevOps => [...prevOps, ...(message.data.operations || [])]);
    }
  }, [currentUserId]);

  const handleTimerStartedEvent = useCallback(() => {
    if (isMountedRef.current) {
      setIsTimerRunning(true);
    }
  }, []);

  const handleTimerPausedEvent = useCallback(() => {
    if (isMountedRef.current) {
      setIsTimerRunning(false);
    }
  }, []);

  const handleTimerResetEvent = useCallback((message: AblyTypes.Message) => {
    if (isMountedRef.current) {
      const duration = validateTimerDuration(message.data.duration);
      setTimerTimeLeft(duration);
      setIsTimerRunning(false);
    }
  }, []);

  const enterPresence = useCallback(async (channel: AblyTypes.RealtimeChannelCallbacks, userData: any) => {
    try {
      await channel.presence.enter(userData);
    } catch (error: any) {
      console.error('❌ [PRESENCE] - Erreur lors de l\'entrée en présence:', error);
    }
  }, []);

  const leavePresence = useCallback(async (channel: AblyTypes.RealtimeChannelCallbacks) => {
    try {
      await channel.presence.leave();
    } catch (error: any) {
      console.warn('⚠️ [PRESENCE] - Erreur lors de la sortie de présence:', error);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    
    if (!ablyClient || !isAblyConnected || !sessionId) {
      return;
    }
    
    const channelName = getSessionChannelName(sessionId);
    const channel = ablyClient.channels.get(channelName);
    channelRef.current = channel;

    const subscriptions = [
      { event: AblyEvents.SIGNAL, handler: handleSignalEvent },
      { event: AblyEvents.SESSION_ENDED, handler: handleSessionEndedEvent },
      { event: AblyEvents.PARTICIPANT_SPOTLIGHTED, handler: handleSpotlightEvent },
      { event: AblyEvents.HAND_RAISE_UPDATE, handler: handleHandRaiseUpdateEvent },
      { event: AblyEvents.HAND_ACKNOWLEDGED, handler: handleHandAcknowledgedEvent },
      { event: AblyEvents.UNDERSTANDING_UPDATE, handler: handleUnderstandingUpdateEvent },
      { event: AblyEvents.ACTIVE_TOOL_CHANGED, handler: handleActiveToolChangeEvent },
      { event: AblyEvents.DOCUMENT_SHARED, handler: handleDocumentSharedEvent },
      { event: AblyEvents.WHITEBOARD_CONTROLLER_UPDATE, handler: handleWhiteboardControllerUpdateEvent },
      { event: AblyEvents.WHITEBOARD_OPERATION_BATCH, handler: handleWhiteboardOperationsEvent },
      { event: AblyEvents.TIMER_STARTED, handler: handleTimerStartedEvent },
      { event: AblyEvents.TIMER_PAUSED, handler: handleTimerPausedEvent },
      { event: AblyEvents.TIMER_RESET, handler: handleTimerResetEvent },
    ];
    
    subscriptions.forEach(({ event, handler }) => {
      channel.subscribe(event, handler);
    });
    
    channel.presence.subscribe(['enter', 'leave', 'update'], handlePresenceUpdate);
    
    const userData = { 
      name: 'User', 
      role: 'UNKNOWN',
      userId: currentUserId 
    };
    
    enterPresence(channel, userData);

    return () => {
      isMountedRef.current = false;
      
      if (channelRef.current) {
        subscriptions.forEach(({ event, handler }) => {
          channelRef.current!.unsubscribe(event, handler);
        });
        
        leavePresence(channelRef.current);
        
        channelRef.current.presence.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [
    ablyClient, isAblyConnected, sessionId, currentUserId, handleSignalEvent,
    handlePresenceUpdate, handleSessionEndedEvent, handleSpotlightEvent, handleHandRaiseUpdateEvent,
    handleHandAcknowledgedEvent, handleUnderstandingUpdateEvent, handleActiveToolChangeEvent,
    handleDocumentSharedEvent, handleWhiteboardControllerUpdateEvent, handleWhiteboardOperationsEvent,
    handleTimerStartedEvent, handleTimerPausedEvent, handleTimerResetEvent,
    enterPresence, leavePresence
  ]);

  return {
      onlineUserIds,
      spotlightedParticipantId,
      handRaiseQueue,
      understandingStatus,
      activeTool,
      documentUrl,
      whiteboardControllerId,
      whiteboardOperations,
      isTimerRunning,
      timerTimeLeft,
      setDocumentUrl,
      setActiveTool,
      setWhiteboardOperations
  };
}
