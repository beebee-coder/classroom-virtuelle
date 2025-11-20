// src/hooks/session/useAblyCommunication.ts - VERSION CORRIGÉE
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

  // CORRECTION : Handler pour les signaux WebRTC avec validation améliorée
  const handleSignalEvent = useCallback((message: AblyTypes.Message) => {
    if (!isMountedRef.current) return;
    
    const data = message.data;
    
    // CORRECTION : Validation des données du signal
    if (!data || typeof data !== 'object') {
      console.warn('⚠️ [COMMUNICATION] - Signal data is invalid');
      return;
    }
    
    if (data.target !== currentUserId) {
      return;
    }
    
    // CORRECTION : Log pour le débogage
    console.log(`🔧 [SIGNAL HANDLER] - Traitement du signal de ${data.userId} vers ${currentUserId}`);
    
    onSignalReceivedRef.current(data.userId, data.signal);
  }, [currentUserId]);

  // CORRECTION : Handler présence avec gestion d'erreur
  const handlePresenceUpdate = useCallback(() => {
    if (!channelRef.current || !isMountedRef.current) return;
    
    channelRef.current.presence.get((err, members) => {
      if (err) {
        console.error('❌ [PRESENCE] - Erreur lors de la récupération des membres:', err);
        return;
      }
      
      if (!isMountedRef.current) return;
      
      if (members && Array.isArray(members)) {
        const uniqueMembers = members
          .map(m => m.clientId)
          .filter((id): id is string => !!id && id !== currentUserId);
        
        const deduplicatedMembers = Array.from(new Set(uniqueMembers));
        setOnlineUserIds(deduplicatedMembers);
        
        console.log(`👥 [PRESENCE] - ${deduplicatedMembers.length} utilisateurs en ligne`);
      } else {
        setOnlineUserIds([]);
      }
    });
  }, [currentUserId]);
  
  const handleSessionEndedEvent = useCallback(() => {
    if (!isMountedRef.current) return;
    
    console.log('🔚 [COMMUNICATION] - Session terminée reçue');
    
    toast({ 
      title: 'Session terminée', 
      description: 'Le professeur a mis fin à la session.' 
    });
    
    if (onSessionEndedRef.current) {
      onSessionEndedRef.current();
    }
  }, [toast]);

  const handleSpotlightEvent = useCallback((message: AblyTypes.Message) => {
    if (!isMountedRef.current) return;
    
    const { participantId } = message.data;
    
    // CORRECTION : Validation du participantId
    if (typeof participantId !== 'string') {
      console.warn('⚠️ [SPOTLIGHT] - participantId invalide:', participantId);
      return;
    }
    
    console.log(`🔦 [SPOTLIGHT] - Participant mis en avant: ${participantId}`);
    setSpotlightedParticipantId(participantId);
  }, []);

  const handleHandRaiseUpdateEvent = useCallback((message: AblyTypes.Message) => {
    if (!isMountedRef.current) return;
    
    const { userId, isRaised } = message.data;
    
    // CORRECTION : Validation des données
    if (typeof userId !== 'string' || typeof isRaised !== 'boolean') {
      console.warn('⚠️ [HAND RAISE] - Données invalides:', message.data);
      return;
    }
    
    setHandRaiseQueue(prev => {
      const newQueue = prev.filter(id => id !== userId);
      if (isRaised) {
        return [...newQueue, userId];
      }
      return newQueue;
    });
    
    console.log(`✋ [HAND RAISE] - ${userId} ${isRaised ? 'lève' : 'baisse'} la main`);
  }, []);

  const handleHandAcknowledgedEvent = useCallback((message: AblyTypes.Message) => {
    if (!isMountedRef.current) return;
    
    const { userId } = message.data;
    
    if (typeof userId !== 'string') {
      console.warn('⚠️ [HAND ACK] - userId invalide:', userId);
      return;
    }
    
    setHandRaiseQueue(prev => prev.filter(id => id !== userId));
    console.log(`✅ [HAND ACK] - Main reconnue pour: ${userId}`);
  }, []);
  
  const handleUnderstandingUpdateEvent = useCallback((message: AblyTypes.Message) => {
    if (!isMountedRef.current) return;
    
    const { userId, status } = message.data;
    
    // CORRECTION : Validation du statut de compréhension
    if (typeof userId !== 'string' || !['low', 'medium', 'high'].includes(status)) {
      console.warn('⚠️ [UNDERSTANDING] - Données de compréhension invalides:', message.data);
      return;
    }
    
    setUnderstandingStatus(prev => new Map(prev).set(userId, status));
    console.log(`🧠 [UNDERSTANDING] - ${userId}: ${status}`);
  }, []);

  const handleActiveToolChangeEvent = useCallback((message: AblyTypes.Message) => {
    if (!isMountedRef.current) return;
    
    const { tool } = message.data;
    
    if (typeof tool !== 'string') {
      console.warn('⚠️ [TOOL CHANGE] - Tool invalide:', tool);
      return;
    }
    
    const validatedTool = validateActiveTool(tool);
    setActiveTool(validatedTool);
    console.log(`🛠️ [TOOL CHANGE] - Outil actif: ${validatedTool}`);
  }, [setActiveTool]);

  const handleDocumentSharedEvent = useCallback((message: AblyTypes.Message) => {
    if (!isMountedRef.current) return;
    
    const { sharedByUserId, url, sharedBy } = message.data;
    
    // CORRECTION : Validation des données du document
    if (typeof sharedByUserId !== 'string' || typeof url !== 'string' || typeof sharedBy !== 'string') {
      console.warn('⚠️ [DOCUMENT SHARE] - Données de document invalides:', message.data);
      return;
    }
    
    if (sharedByUserId !== currentUserId) {
      setDocumentUrl(url);
      setActiveTool('document');
      
      toast({
        title: 'Document partagé',
        description: `${sharedBy} a partagé un nouveau document.`
      });
      
      console.log(`📄 [DOCUMENT SHARE] - Document partagé par ${sharedBy}: ${url}`);
    }
  }, [currentUserId, toast, setDocumentUrl, setActiveTool]);

  const handleWhiteboardControllerUpdateEvent = useCallback((message: AblyTypes.Message) => {
    if (!isMountedRef.current) return;
    
    const { controllerId } = message.data;
    
    if (typeof controllerId !== 'string' && controllerId !== null) {
      console.warn('⚠️ [WHITEBOARD CONTROLLER] - controllerId invalide:', controllerId);
      return;
    }
    
    setWhiteboardControllerId(controllerId);
    console.log(`🎮 [WHITEBOARD CONTROLLER] - Contrôleur: ${controllerId}`);
  }, []);
  
  const handleTimerStartedEvent = useCallback(() => {
    if (!isMountedRef.current) return;
    
    setIsTimerRunning(true);
    console.log('⏱️ [TIMER] - Timer démarré');
  }, []);

  const handleTimerPausedEvent = useCallback(() => {
    if (!isMountedRef.current) return;
    
    setIsTimerRunning(false);
    console.log('⏸️ [TIMER] - Timer en pause');
  }, []);

  const handleTimerResetEvent = useCallback((message: AblyTypes.Message) => {
    if (!isMountedRef.current) return;
    
    const { duration } = message.data;
    const validatedDuration = validateTimerDuration(duration);
    
    setTimerTimeLeft(validatedDuration);
    setIsTimerRunning(false);
    
    console.log(`🔄 [TIMER] - Timer réinitialisé: ${validatedDuration}s`);
  }, []);

  const handleQuizStartedEvent = useCallback((message: AblyTypes.Message) => {
    if (!isMountedRef.current) return;
    
    const { quiz } = message.data;
    
    // CORRECTION : Validation basique du quiz
    if (!quiz || typeof quiz !== 'object') {
      console.warn('⚠️ [QUIZ START] - Données de quiz invalides');
      return;
    }
    
    setActiveQuiz(quiz as Quiz);
    console.log('❓ [QUIZ START] - Quiz démarré');
  }, [setActiveQuiz]);

  const handleQuizResponseEvent = useCallback((message: AblyTypes.Message) => {
    if (!isMountedRef.current) return;
    
    const response = message.data;
    
    // CORRECTION : Validation de la réponse
    if (!response || typeof response !== 'object') {
      console.warn('⚠️ [QUIZ RESPONSE] - Réponse de quiz invalide');
      return;
    }
    
    onNewQuizResponse(response as QuizResponse);
    console.log(`📝 [QUIZ RESPONSE] - Nouvelle réponse reçue`);
  }, [onNewQuizResponse]);
  
  const handleQuizEndedEvent = useCallback((message: AblyTypes.Message) => {
    if (!isMountedRef.current) return;
    
    const { results } = message.data;
    
    // CORRECTION : Validation des résultats
    if (!results || typeof results !== 'object') {
      console.warn('⚠️ [QUIZ END] - Résultats de quiz invalides');
      return;
    }
    
    onQuizEnded(results as QuizResults);
    console.log('🏁 [QUIZ END] - Quiz terminé');
  }, [onQuizEnded]);

  // CORRECTION : Fonctions présence avec gestion d'erreur améliorée
  const enterPresence = useCallback(async (channel: AblyTypes.RealtimeChannelCallbacks, userData: any) => {
    try {
      await channel.presence.enter(userData);
      console.log(`✅ [PRESENCE] - Entrée en présence réussie pour ${currentUserId}`);
    } catch (error: any) {
      console.error('❌ [PRESENCE] - Erreur lors de l\'entrée en présence:', error);
    }
  }, [currentUserId]);

  const leavePresence = useCallback(async (channel: AblyTypes.RealtimeChannelCallbacks) => {
    try {
      await channel.presence.leave();
      console.log(`✅ [PRESENCE] - Sortie de présence réussie pour ${currentUserId}`);
    } catch (error: any) {
      console.warn('⚠️ [PRESENCE] - Erreur lors de la sortie de présence:', error);
    }
  }, [currentUserId]);

  // CORRECTION : Effet principal avec meilleure gestion des dépendances
  useEffect(() => {
    isMountedRef.current = true;
    
    if (!ablyClient || !isAblyConnected || !sessionId) {
      console.log('⏳ [COMMUNICATION] - En attente de connexion Ably...');
      return;
    }
    
    const channelName = getSessionChannelName(sessionId);
    const channel = ablyClient.channels.get(channelName);
    channelRef.current = channel;

    console.log(`🔧 [COMMUNICATION] - Initialisation pour le canal: ${channelName}`);

    // CORRECTION : Liste des abonnements avec gestion des doublons
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
    
    // CORRECTION : S'abonner aux événements
    subscriptions.forEach(({ event, handler }) => {
      channel.subscribe(event, handler);
    });
    
    // S'abonner aux événements de présence
    channel.presence.subscribe(['enter', 'leave', 'update'], handlePresenceUpdate);
    
    // Données utilisateur pour la présence
    const userData = { 
      name: 'User', 
      role: 'UNKNOWN',
      userId: currentUserId 
    };
    
    // Entrer en présence
    enterPresence(channel, userData);

    return () => {
      console.log('🧹 [COMMUNICATION] - Nettoyage du hook de communication');
      isMountedRef.current = false;
      
      if (channelRef.current) {
        // CORRECTION : Désabonnement de tous les événements
        subscriptions.forEach(({ event, handler }) => {
          channelRef.current!.unsubscribe(event, handler);
        });
        
        // Désabonnement des événements de présence
        channelRef.current.presence.unsubscribe();
        
        // Sortie de présence
        leavePresence(channelRef.current);
        
        channelRef.current = null;
      }
    };
  }, [
    ablyClient, 
    isAblyConnected, 
    sessionId, 
    currentUserId,
    // CORRECTION : Réduction des dépendances aux callbacks stables
    handlePresenceUpdate,
    enterPresence, 
    leavePresence
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