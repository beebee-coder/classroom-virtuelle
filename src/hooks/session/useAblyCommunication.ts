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
  onSignalReceived?: (fromUserId: string, signal: any) => void;
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
      console.log(`🔔 [SIGNAL IGNORED] - Signal de ${data.userId} ignoré (destiné à ${data.target}, moi: ${currentUserId})`);
      return;
    }
    
    console.log(`🔔 [SIGNAL RECEIVED] - Signal reçu de ${data.userId} pour ${currentUserId} (type: ${data.signal?.type})`);
    
    if (onSignalReceived) {
      onSignalReceived(data.userId, data.signal);
    } else {
      console.warn('⚠️ [SIGNAL] - Aucun handler configuré pour les signaux WebRTC');
    }
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
        console.log(`👥 [PRESENCE] - ${deduplicatedMembers.length} utilisateurs en ligne:`, deduplicatedMembers);
        setOnlineUserIds(deduplicatedMembers);
      } else {
        console.warn('⚠️ [PRESENCE] - Aucun membre ou format invalide:', members);
        setOnlineUserIds([]);
      }
    });
  }, [currentUserId]);
  
  const handleSessionEndedEvent = useCallback(() => {
    if (!isMountedRef.current) return;
    console.log('🛑 [SESSION] - Événement de fin de session reçu');
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
      console.log(`🌟 [SPOTLIGHT] - Participant mis en vedette: ${message.data.participantId}`);
      setSpotlightedParticipantId(message.data.participantId);
    }
  }, []);

  const handleHandRaiseUpdateEvent = useCallback((message: AblyTypes.Message) => {
    if (!isMountedRef.current) return;
    const { userId, isRaised } = message.data;
    
    setHandRaiseQueue(prev => {
      const newQueue = prev.filter(id => id !== userId);
      if (isRaised) {
        console.log(`✋ [HAND RAISE] - ${userId} lève la main`);
        newQueue.push(userId);
      } else {
        console.log(`👇 [HAND DOWN] - ${userId} baisse la main`);
      }
      return newQueue;
    });
  }, []);

  const handleHandAcknowledgedEvent = useCallback((message: AblyTypes.Message) => {
    if (isMountedRef.current) {
      console.log(`✅ [HAND ACKNOWLEDGED] - Main de ${message.data.userId} reconnue`);
      setHandRaiseQueue(prev => prev.filter(id => id !== message.data.userId));
    }
  }, []);
  
  const handleUnderstandingUpdateEvent = useCallback((message: AblyTypes.Message) => {
    if (isMountedRef.current) {
      console.log(`🤔 [UNDERSTANDING] - Statut de ${message.data.userId}: ${message.data.status}`);
      setUnderstandingStatus(prev => new Map(prev).set(message.data.userId, message.data.status));
    }
  }, []);

  const handleActiveToolChangeEvent = useCallback((message: AblyTypes.Message) => {
    if (isMountedRef.current) {
      const validatedTool = validateActiveTool(message.data.tool);
      console.log(`🛠️ [TOOL CHANGE] - Outil activé: ${validatedTool}`);
      setActiveTool(validatedTool);
    }
  }, []);

  const handleDocumentSharedEvent = useCallback((message: AblyTypes.Message) => {
    if (isMountedRef.current && message.data.sharedByUserId !== currentUserId) {
      console.log(`📄 [DOCUMENT SHARED] - Document partagé: ${message.data.name}`);
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
      console.log(`🎨 [WHITEBOARD CONTROLLER] - Contrôleur changé: ${message.data.controllerId}`);
      setWhiteboardControllerId(message.data.controllerId);
    }
  }, []);

  const handleWhiteboardOperationsEvent = useCallback((message: AblyTypes.Message) => {
    if (isMountedRef.current && message.data.userId !== currentUserId) {
      console.log(`✏️ [WHITEBOARD OPS] - ${message.data.operations?.length || 0} opérations reçues de ${message.data.userId}`);
      setWhiteboardOperations(prevOps => [...prevOps, ...(message.data.operations || [])]);
    }
  }, [currentUserId]);

  const handleTimerStartedEvent = useCallback(() => {
    if (isMountedRef.current) {
      console.log('⏰ [TIMER] - Minuteur démarré');
      setIsTimerRunning(true);
    }
  }, []);

  const handleTimerPausedEvent = useCallback(() => {
    if (isMountedRef.current) {
      console.log('⏸️ [TIMER] - Minuteur en pause');
      setIsTimerRunning(false);
    }
  }, []);

  const handleTimerResetEvent = useCallback((message: AblyTypes.Message) => {
    if (isMountedRef.current) {
      const duration = validateTimerDuration(message.data.duration);
      console.log(`🔄 [TIMER] - Minuteur réinitialisé: ${duration}s`);
      setTimerTimeLeft(duration);
      setIsTimerRunning(false);
    }
  }, []);

  // Fonction helper pour entrer en présence avec gestion d'erreur
  const enterPresence = useCallback(async (channel: AblyTypes.RealtimeChannelCallbacks, userData: any) => {
    try {
      await channel.presence.enter(userData);
      console.log('✅ [PRESENCE] - Entrée réussie dans le canal de présence');
    } catch (error: any) {
      console.error('❌ [PRESENCE] - Erreur lors de l\'entrée en présence:', error);
    }
  }, []);

  // Fonction helper pour quitter la présence avec gestion d'erreur
  const leavePresence = useCallback(async (channel: AblyTypes.RealtimeChannelCallbacks) => {
    try {
      await channel.presence.leave();
      console.log('✅ [PRESENCE] - Sortie réussie du canal de présence');
    } catch (error: any) {
      console.warn('⚠️ [PRESENCE] - Erreur lors de la sortie de présence:', error);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    
    if (!ablyClient || !isAblyConnected || !sessionId) {
      console.log('⏳ [ABLY COMM] - En attente des prérequis:', {
        hasAblyClient: !!ablyClient,
        isAblyConnected,
        hasSessionId: !!sessionId
      });
      return;
    }
    
    console.log(`📡 [ABLY COMM] - Initialisation pour la session: ${sessionId}`);
    
    const channelName = getSessionChannelName(sessionId);
    const channel = ablyClient.channels.get(channelName);
    channelRef.current = channel;

    // Abonnement aux événements
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
    
    // Appliquer tous les abonnements
    subscriptions.forEach(({ event, handler }) => {
      channel.subscribe(event, handler);
      console.log(`✅ [ABLY COMM] - Abonné à l'événement: ${event}`);
    });
    
    // Gestion de la présence
    channel.presence.subscribe(['enter', 'leave', 'update'], handlePresenceUpdate);
    
    // Entrer dans le canal de présence
    const userData = { 
      name: 'User', 
      role: 'UNKNOWN',
      userId: currentUserId 
    };
    
    enterPresence(channel, userData);

    return () => {
      console.log('🧹 [ABLY COMM] - Nettoyage du hook de communication');
      isMountedRef.current = false;
      
      if (channelRef.current) {
        // Désabonner de tous les événements
        subscriptions.forEach(({ event, handler }) => {
          channelRef.current!.unsubscribe(event, handler);
        });
        
        // Quitter la présence
        leavePresence(channelRef.current);
        
        channelRef.current.presence.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [
    ablyClient, 
    isAblyConnected, 
    sessionId, 
    currentUserId,
    handleSignalEvent,
    handlePresenceUpdate, 
    handleSessionEndedEvent, 
    handleSpotlightEvent, 
    handleHandRaiseUpdateEvent,
    handleHandAcknowledgedEvent, 
    handleUnderstandingUpdateEvent, 
    handleActiveToolChangeEvent,
    handleDocumentSharedEvent, 
    handleWhiteboardControllerUpdateEvent, 
    handleWhiteboardOperationsEvent,
    handleTimerStartedEvent, 
    handleTimerPausedEvent, 
    handleTimerResetEvent,
    enterPresence,
    leavePresence
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