// src/hooks/session/useAblyCommunication.ts - VERSION CORRIGÉE ET VALIDÉE
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNamedAbly } from '@/hooks/useNamedAbly';
import { getSessionChannelName } from '@/lib/ably/channels';
import { AblyEvents } from '@/lib/ably/events';
import { ComprehensionLevel, QuizWithQuestions, QuizResponse, QuizResults, BreakoutRoom } from '@/types'; // CORRECTION: Utiliser QuizWithQuestions
import type { RealtimeChannel, Message, PresenceMessage } from 'ably'; // ✅ Import direct
import { useToast } from '../use-toast';

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
  onSignalReceived: (fromUserId: string, signal: unknown, isReturnSignal?: boolean) => void; // ✅ signal: unknown au lieu de any
  setActiveTool: (tool: string) => void;
  setDocumentUrl: (url: string | null) => void;
  setActiveQuiz: (quiz: QuizWithQuestions) => void; // CORRECTION: Utiliser QuizWithQuestions
  onNewQuizResponse: (response: QuizResponse) => void;
  onQuizEnded: (results: QuizResults) => void;
  onQuizClosed: () => void;
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
  onQuizEnded,
  onQuizClosed,
}: AblyCommunicationProps) {
  const { client: ablyClient, isConnected: isAblyConnected } = useNamedAbly('useAblyCommunication');
  const { toast } = useToast();

  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [spotlightedParticipantId, setSpotlightedParticipantId] = useState<string | null>(initialTeacherId);
  const [handRaiseQueue, setHandRaiseQueue] = useState<string[]>([]);
  const [understandingStatus, setUnderstandingStatus] = useState<Map<string, ComprehensionLevel>>(new Map());
  const [whiteboardControllerId, setWhiteboardControllerId] = useState<string | null>(initialTeacherId);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerTimeLeft, setTimerTimeLeft] = useState<number>(3600);
  const [breakoutRoomInfo, setBreakoutRoomInfo] = useState<BreakoutRoom | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null); // ✅ Typé correctement
  const isMountedRef = useRef(true);
  
  const onSignalReceivedRef = useRef(onSignalReceived);
  useEffect(() => { onSignalReceivedRef.current = onSignalReceived; }, [onSignalReceived]);

  const onSessionEndedRef = useRef(onSessionEnded);
  useEffect(() => { onSessionEndedRef.current = onSessionEnded; }, [onSessionEnded]);

  useEffect(() => {
    let timerInterval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timerTimeLeft > 0) {
      timerInterval = setInterval(() => setTimerTimeLeft((prevTime) => prevTime > 0 ? prevTime - 1 : 0), 1000);
    }
    return () => { if (timerInterval) clearInterval(timerInterval); };
  }, [isTimerRunning, timerTimeLeft]);

  const handleSignalEvent = useCallback((message: Message) => {
    if (message.data.target === currentUserId) {
      onSignalReceivedRef.current(
        message.data.userId, 
        message.data.signal,
        message.data.isReturnSignal
      );
    }
  }, [currentUserId]);

  const handlePresenceUpdate = useCallback(() => {
    if (!channelRef.current) return;

    // Fonction async interne
    const fetchPresence = async () => {
      try {
        const members = await channelRef.current!.presence.get(); // ✅ Promise-based
        const userIds = members
          .map(member => member.clientId)
          .filter((clientId): clientId is string => typeof clientId === 'string');
        setOnlineUserIds(userIds);
      } catch (err) {
        console.warn('⚠️ [PRESENCE] - Erreur lors de la récupération des membres:', err);
      }
    };

    void fetchPresence(); // Appel sans await (fire-and-forget)
  }, []);
  const handleSessionEndedEvent = useCallback(() => { 
    onSessionEndedRef.current?.(); 
  }, []);

  const handleSpotlightEvent = useCallback((message: Message) => {
    setSpotlightedParticipantId(message.data.participantId);
  }, []);

  const handleHandRaiseUpdateEvent = useCallback((message: Message) => {
    setHandRaiseQueue(prev => {
      const newQueue = prev.filter(id => id !== message.data.userId);
      return message.data.isRaised ? [...newQueue, message.data.userId] : newQueue;
    });
  }, []);

  const handleHandAcknowledgedEvent = useCallback((message: Message) => {
    setHandRaiseQueue(prev => prev.filter(id => id !== message.data.userId));
  }, []);

  const handleUnderstandingUpdateEvent = useCallback((message: Message) => {
    setUnderstandingStatus(prev => new Map(prev).set(message.data.userId, message.data.status));
  }, []);

  const handleActiveToolChangeEvent = useCallback((message: Message) => {
    setActiveTool(validateActiveTool(message.data.tool));
  }, [setActiveTool]);

  const handleDocumentSharedEvent = useCallback((message: Message) => {
    if (message.data.sharedByUserId !== currentUserId) {
      setDocumentUrl(message.data.url);
      setActiveTool('document');
      toast({ 
        title: 'Document partagé', 
        description: `${message.data.sharedBy} a partagé un document.` 
      });
    }
  }, [currentUserId, setDocumentUrl, setActiveTool, toast]);

  const handleWhiteboardControllerUpdateEvent = useCallback((message: Message) => {
    setWhiteboardControllerId(message.data.controllerId);
  }, []);

  const handleTimerStartedEvent = useCallback(() => {
    setIsTimerRunning(true);
  }, []);

  const handleTimerPausedEvent = useCallback(() => {
    setIsTimerRunning(false);
  }, []);

  const handleTimerResetEvent = useCallback((message: Message) => {
    setTimerTimeLeft(validateTimerDuration(message.data.duration));
    setIsTimerRunning(false);
  }, []);

  const handleQuizStartedEvent = useCallback((message: Message) => {
    setActiveTool('quiz');
    // CORRECTION: Vérifier si le quiz contient des questions, sinon ajouter un tableau vide
    const quizData = message.data.quiz;
    const quizWithQuestions: QuizWithQuestions = {
      ...quizData,
      questions: quizData.questions || [] // S'assurer que questions existe
    };
    setActiveQuiz(quizWithQuestions);
  }, [setActiveQuiz, setActiveTool]);

  const handleQuizResponseEvent = useCallback((message: Message) => {
    onNewQuizResponse(message.data as QuizResponse);
  }, [onNewQuizResponse]);

  const handleQuizEndedEvent = useCallback((message: Message) => {
    onQuizEnded(message.data.results as QuizResults);
  }, [onQuizEnded]);

  const handleQuizClosedEvent = useCallback(() => {
    onQuizClosed();
  }, [onQuizClosed]);

  const handleBreakoutRoomsStarted = useCallback((message: Message) => {
    const { rooms } = message.data as { rooms: BreakoutRoom[] };
    const myRoom = rooms.find(room => room.participants.some(p => p.id === currentUserId));
    if (myRoom) {
      setBreakoutRoomInfo(myRoom);
    }
  }, [currentUserId]);

  const handleBreakoutRoomsEnded = useCallback(() => {
    setBreakoutRoomInfo(null);
  }, []);

  const enterPresence = useCallback(async (channel: RealtimeChannel) => {
    try {
      await channel.presence.enter();
    } catch (error) {
      console.error('❌ [PRESENCE] - Erreur lors de l\'entrée en présence:', error);
    }
  }, []);

  const leavePresence = useCallback(async (channel: RealtimeChannel) => {
    try {
      await channel.presence.leave();
    } catch (error) {
      console.error('❌ [PRESENCE] - Erreur lors de la sortie de présence:', error);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    
    if (!ablyClient || !isAblyConnected || !sessionId) return;

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
      { event: AblyEvents.QUIZ_CLOSED, handler: handleQuizClosedEvent },
      { event: AblyEvents.BREAKOUT_ROOMS_STARTED, handler: handleBreakoutRoomsStarted },
      { event: AblyEvents.BREAKOUT_ROOMS_ENDED, handler: handleBreakoutRoomsEnded },
    ];

    subscriptions.forEach(({ event, handler }) => {
      channel.subscribe(event, handler);
    });

    channel.presence.subscribe(['enter', 'leave', 'update'], handlePresenceUpdate);
    enterPresence(channel);

    return () => {
      isMountedRef.current = false;
      
      if (channelRef.current) {
        subscriptions.forEach(({ event, handler }) => {
          channelRef.current!.unsubscribe(event, handler);
        });
        channelRef.current.presence.unsubscribe();
        leavePresence(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [
    ablyClient, 
    isAblyConnected, 
    sessionId, 
    handlePresenceUpdate, 
    enterPresence, 
    leavePresence,
    // Tous les handlers restent dans les dépendances — mais on pourrait les stabiliser via `useEvent` si besoin plus tard
    handleSignalEvent,
    handleSessionEndedEvent,
    handleSpotlightEvent,
    handleHandRaiseUpdateEvent,
    handleHandAcknowledgedEvent,
    handleUnderstandingUpdateEvent,
    handleActiveToolChangeEvent,
    handleDocumentSharedEvent,
    handleWhiteboardControllerUpdateEvent,
    handleTimerStartedEvent,
    handleTimerPausedEvent,
    handleTimerResetEvent,
    handleQuizStartedEvent,
    handleQuizResponseEvent,
    handleQuizEndedEvent,
    handleQuizClosedEvent,
    handleBreakoutRoomsStarted,
    handleBreakoutRoomsEnded
  ]);

  return { 
    onlineUserIds, 
    spotlightedParticipantId, 
    handRaiseQueue, 
    understandingStatus, 
    whiteboardControllerId, 
    isTimerRunning, 
    timerTimeLeft, 
    breakoutRoomInfo 
  };
}