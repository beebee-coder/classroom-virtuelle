// src/hooks/session/useAblyCommunication.ts
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAbly } from '@/hooks/useAbly';
import { getSessionChannelName } from '@/lib/ably/channels';
import { AblyEvents } from '@/lib/ably/events';
import { ComprehensionLevel, WhiteboardOperation, Quiz, QuizResponse, QuizResults } from '@/types';
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
  // Fonctions pour mettre à jour l'état du parent (SessionClient)
  setActiveTool: (tool: string) => void;
  setDocumentUrl: (url: string | null) => void;
  setActiveQuiz: (quiz: Quiz) => void;
  onNewQuizResponse: (response: QuizResponse) => void;
  onQuizEnded: (results: QuizResults) => void;
}

export function useAblyCommunication({ 
  sessionId, 
  currentUserId,
  initialTeacherId,
  onSessionEnded,
  onSignalReceived,
  setActiveTool,
  setDocumentUrl,
  setActiveQuiz,
  onNewQuizResponse,
  onQuizEnded
}: AblyCommunicationProps) {
  const { client: ablyClient, isConnected: isAblyConnected } = useAbly();
  const { toast } = useToast();

  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [spotlightedParticipantId, setSpotlightedParticipantId] = useState<string | null>(initialTeacherId);
  const [handRaiseQueue, setHandRaiseQueue] = useState<string[]>([]);
  const [understandingStatus, setUnderstandingStatus] = useState<Map<string, ComprehensionLevel>>(new Map());
  const [whiteboardControllerId, setWhiteboardControllerId] = useState<string | null>(initialTeacherId);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerTimeLeft, setTimerTimeLeft] = useState<number>(3600);

  const channelRef = useRef<AblyTypes.RealtimeChannelCallbacks | null>(null);
  const isMountedRef = useRef(true);
  
  const onSignalReceivedRef = useRef(onSignalReceived);
  useEffect(() => {
    onSignalReceivedRef.current = onSignalReceived;
  }, [onSignalReceived]);

  const onSessionEndedRef = useRef(onSessionEnded);
  useEffect(() => {
    onSessionEndedRef.current = onSessionEnded;
  }, [onSessionEnded]);

  // Handler pour les signaux WebRTC
  const handleSignalEvent = useCallback((message: AblyTypes.Message) => {
    if (!isMountedRef.current) return;
    
    const data = message.data;
    
    if (data.target !== currentUserId) {
      return;
    }
    
    onSignalReceivedRef.current(data.userId, data.signal);
  }, [currentUserId]);

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
    if (onSessionEndedRef.current) {
      onSessionEndedRef.current();
    }
  }, [toast]);

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
  }, [setActiveTool]);

  const handleDocumentSharedEvent = useCallback((message: AblyTypes.Message) => {
    if (isMountedRef.current && message.data.sharedByUserId !== currentUserId) {
      setDocumentUrl(message.data.url);
      setActiveTool('document');
      
      toast({
        title: 'Document partagé',
        description: `${message.data.sharedBy} a partagé un nouveau document.`
      });
    }
  }, [currentUserId, toast, setDocumentUrl, setActiveTool]);

  const handleWhiteboardControllerUpdateEvent = useCallback((message: AblyTypes.Message) => {
    if (isMountedRef.current) {
      setWhiteboardControllerId(message.data.controllerId);
    }
  }, []);
  
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

  const handleQuizStartedEvent = useCallback((message: AblyTypes.Message) => {
    if (isMountedRef.current) {
      setActiveQuiz(message.data.quiz as Quiz);
    }
  }, [setActiveQuiz]);

  const handleQuizResponseEvent = useCallback((message: AblyTypes.Message) => {
    if (isMountedRef.current) {
      onNewQuizResponse(message.data as QuizResponse);
    }
  }, [onNewQuizResponse]);
  
  const handleQuizEndedEvent = useCallback((message: AblyTypes.Message) => {
    if (isMountedRef.current) {
      onQuizEnded(message.data.results as QuizResults);
    }
  }, [onQuizEnded]);

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
      { event: AblyEvents.TIMER_STARTED, handler: handleTimerStartedEvent },
      { event: AblyEvents.TIMER_PAUSED, handler: handleTimerPausedEvent },
      { event: AblyEvents.TIMER_RESET, handler: handleTimerResetEvent },
      { event: AblyEvents.QUIZ_STARTED, handler: handleQuizStartedEvent },
      { event: AblyEvents.QUIZ_RESPONSE, handler: handleQuizResponseEvent },
      { event: AblyEvents.QUIZ_ENDED, handler: handleQuizEndedEvent },
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
    ablyClient, isAblyConnected, sessionId, currentUserId, 
    handleSignalEvent, handlePresenceUpdate, handleSessionEndedEvent, handleSpotlightEvent,
    handleHandRaiseUpdateEvent, handleHandAcknowledgedEvent, handleUnderstandingUpdateEvent,
    handleActiveToolChangeEvent, handleDocumentSharedEvent, handleWhiteboardControllerUpdateEvent,
    handleTimerStartedEvent, handleTimerPausedEvent, handleTimerResetEvent,
    handleQuizStartedEvent, handleQuizResponseEvent, handleQuizEndedEvent,
    enterPresence, leavePresence
  ]);

  return {
      onlineUserIds,
      spotlightedParticipantId,
      handRaiseQueue,
      understandingStatus,
      whiteboardControllerId,
      isTimerRunning,
      timerTimeLeft,
  };
}
