// src/components/SessionClient.tsx - VERSION CORRIGÉE AVEC useAbly()
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Instance as PeerInstance, SignalData as PeerSignalData } from 'simple-peer';
import SimplePeer from 'simple-peer';
import { useToast } from '@/hooks/use-toast';
import { User, Role } from '@prisma/client';
import type { SessionClientProps, IncomingSignalData, SignalPayload, SessionParticipant, DocumentInHistory, WhiteboardOperation } from '@/types';
import SessionLoading from './SessionLoading';
import { SessionHeader } from './session/SessionHeader';
import { PermissionPrompt } from './PermissionPrompt';
import { ablyTrigger } from '@/lib/ably/triggers';
import { broadcastTimerEvent, broadcastActiveTool, updateStudentSessionStatus } from '@/lib/actions/ably-session.actions';
import { endCoursSession } from '@/lib/actions/session.actions';
import { ComprehensionLevel } from '@/types';
import { useAbly } from '@/hooks/useAbly'; // CORRECTION: utiliser useAbly au lieu de useAblyWithSession
import Ably, { type Types } from 'ably';
import { getSessionChannelName } from '@/lib/ably/channels';
import { AblyEvents } from '@/lib/ably/events';

// Importation statique car SessionClient est lui-même chargé dynamiquement
import { TeacherSessionView } from './session/TeacherSessionView';
import { StudentSessionView } from './session/StudentSessionView';
import { useAblyWhiteboardSync } from '@/hooks/useAblyWhiteboardSync';

const signalViaAPI = async (payload: SignalPayload): Promise<void> => {
    try {
        await fetch('/api/ably/signal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.error('❌ [SIGNAL] - Erreur d\'envoi du signal via API:', error);
    }
};

const validateTimerDuration = (duration: unknown): number => {
    if (typeof duration !== 'number' || isNaN(duration) || duration <= 0) {
        console.warn('Invalid timer duration detected, using default:', duration);
        return 3600;
    }
    return duration;
};

export default function SessionClient({
  sessionId,
  initialStudents,
  initialTeacher,
  currentUserRole,
  currentUserId,
  classroom,
  initialDocumentHistory = [],
}: SessionClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  // CORRECTION: Protection Fast Refresh simplifiée et cohérente
  const mountIdRef = useRef(`session_${Math.random().toString(36).substring(2, 11)}`);
  const isMountedRef = useRef(true);
  
  // CORRECTION: Utiliser useAbly() au lieu de useAblyWithSession()
  const { client: ablyClient, isConnected: isAblyConnected, connectionState } = useAbly();
  const ablyLoading = connectionState === 'initialized' || connectionState === 'connecting';  
  const [loading, setLoading] = useState<boolean>(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isSharingScreen, setIsSharingScreen] = useState<boolean>(false);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [spotlightedParticipantId, setSpotlightedParticipantId] = useState<string | null>(initialTeacher?.id || null);
  
  const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set());
  const [understandingStatus, setUnderstandingStatus] = useState<Map<string, ComprehensionLevel>>(new Map());
  const [isEndingSession, setIsEndingSession] = useState<boolean>(false);
  
  const getInitialActiveTool = () => (typeof window !== 'undefined' ? localStorage.getItem(`activeTool_${sessionId}`) : null) || 'camera';
  const [activeTool, setActiveTool] = useState<string>(getInitialActiveTool());

  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentHistory, setDocumentHistory] = useState(initialDocumentHistory);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const INITIAL_TIMER_DURATION = 3600;
  const [timerDuration, setTimerDuration] = useState<number>(INITIAL_TIMER_DURATION);
  const [timerTimeLeft, setTimerTimeLeft] = useState<number>(timerDuration);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  const [whiteboardOperations, setWhiteboardOperations] = useState<WhiteboardOperation[]>([]);
  
  // CORRECTION: Gestion améliorée des opérations whiteboard
  const handleIncomingWhiteboardOperations = useCallback((externalOps: WhiteboardOperation[]) => {
    if (!isMountedRef.current) return;
    
    setWhiteboardOperations(prevOps => {
      // Éviter les doublons
      const existingIds = new Set(prevOps.map(op => op.id));
      const newOps = externalOps.filter(op => !existingIds.has(op.id));
      if (newOps.length > 0) {
        // console.log(`[SessionClient] Applying ${newOps.length} new whiteboard operations.`);
      }
      return [...prevOps, ...newOps];
    });
  }, []);

  const { sendOperation, flushOperations } = useAblyWhiteboardSync(
    sessionId, 
    currentUserId, 
    handleIncomingWhiteboardOperations
  );
  
  const [whiteboardControllerId, setWhiteboardControllerId] = useState<string | null>(initialTeacher?.id || null);
  
  const peersRef = useRef<Map<string, PeerInstance>>(new Map());
  const channelRef = useRef<Ably.Types.RealtimeChannelCallbacks | null>(null);
  const mediaCleanupRef = useRef<(() => void) | null>(null);

  // CORRECTION: Mémoriser les données utilisateur pour éviter les changements de référence
  const teacherName = initialTeacher?.name || '';
  const studentNames = useMemo(() => 
    initialStudents.reduce((acc, student) => {
      if (student?.id && student?.name) acc[student.id] = student.name;
      return acc;
    }, {} as Record<string, string>),
    [initialStudents]
  );

  // CORRECTION: Stockage local simplifié
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`activeTool_${sessionId}`, activeTool);
    }
  }, [activeTool, sessionId]);
  
  // CORRECTION: cleanupPeerConnection avec dépendances réduites
  const cleanupPeerConnection = useCallback((userId: string): void => {
    const peer = peersRef.current.get(userId);
    if (peer && !peer.destroyed) {
        peer.destroy();
    }
    peersRef.current.delete(userId);
    
    setRemoteStreams(prev => {
        const newMap = new Map(prev);
        const stream = newMap.get(userId);
        stream?.getTracks().forEach(track => track.stop());
        newMap.delete(userId);
        return newMap;
    });
  }, []);

  // CORRECTION: createPeer avec dépendances correctes
  const createPeer = useCallback((targetUserId: string, initiator: boolean, stream: MediaStream | null): PeerInstance | undefined => {
    if (!stream || !isMountedRef.current) return;

    try {
        const peer = new SimplePeer({
            initiator,
            trickle: true,
            stream: stream,
        });

        peer.on('signal', (signal: PeerSignalData) => {
            if (isMountedRef.current) {
                signalViaAPI({
                    channelName: getSessionChannelName(sessionId),
                    userId: currentUserId,
                    target: targetUserId,
                    signal,
                    isReturnSignal: !initiator
                });
            }
        });

        peer.on('stream', (remoteStream: MediaStream) => {
            if (isMountedRef.current) {
                setRemoteStreams(prev => new Map(prev).set(targetUserId, remoteStream));
            }
        });

        peer.on('error', (err: Error) => {
          console.error('❌ [PEER] - Peer error:', err);
          cleanupPeerConnection(targetUserId);
        });
        
        peer.on('close', () => cleanupPeerConnection(targetUserId));
        
        peersRef.current.set(targetUserId, peer);
        return peer;
    } catch (error) {
        console.error('❌ [PEER] - Error creating peer:', error);
        return undefined;
    }
  }, [sessionId, currentUserId, cleanupPeerConnection]);

  // CORRECTION: Gestion améliorée du stream média
  useEffect(() => {
    isMountedRef.current = true;
    
    console.log(`🎬 [SESSION CLIENT] - Mount for session: ${sessionId}, user: ${currentUserId}`);
    
    let stream: MediaStream | null = null;
    
    const getMedia = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720 }, 
          audio: true 
        });
        if (isMountedRef.current) {
          setLocalStream(stream);
          setIsMuted(false);
          setIsVideoOff(false);
        }
      } catch (error) {
        console.warn('⚠️ [MEDIA] - Mode observateur activé (pas d\'accès caméra/micro)');
        if (isMountedRef.current) {
          setLocalStream(null);
        }
      }
    };

    mediaCleanupRef.current = () => {
      stream?.getTracks().forEach(track => track.stop());
      screenStream?.getTracks().forEach(track => track.stop());
    };
    
    getMedia();

    return () => {
      isMountedRef.current = false;
      mediaCleanupRef.current?.();
      console.log(`🧹 [SESSION CLIENT] - Unmount for session: ${sessionId}`);
    };
  }, [sessionId, currentUserId, screenStream]); // screenStream ajouté pour le cleanup

  // CORRECTION: Gestion séparée du screen stream avec dépendances correctes
  useEffect(() => {
    if (!screenStream) return;
    
    const handleTrackEnded = () => {
      if (isMountedRef.current) {
        console.log('🔄 [SCREEN SHARE] - Screen share track ended');
        // CORRECTION: Utiliser la fonction directement plutôt que toggleScreenShare pour éviter les dépendances circulaires
        screenStream.getTracks().forEach(track => track.stop());
        setScreenStream(null);
        setIsSharingScreen(false);
      }
    };

    screenStream.getTracks().forEach(track => {
      track.addEventListener('ended', handleTrackEnded);
    });

    return () => {
      screenStream.getTracks().forEach(track => {
        track.removeEventListener('ended', handleTrackEnded);
      });
    };
  }, [screenStream]);

  // CORRECTION: toggleScreenShare avec gestion d'état correcte
  const toggleScreenShare = useCallback(async () => {
    if (isSharingScreen && screenStream) {
      // Arrêter le partage d'écran
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
      setIsSharingScreen(false);

      // Revenir au stream local pour tous les peers
      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
          peersRef.current.forEach(peer => {
            if (!peer.destroyed && peer.streams?.[0]) {
              try {
                peer.replaceTrack(
                  peer.streams[0].getVideoTracks()[0] || null, 
                  videoTrack, 
                  peer.streams[0]
                );
              } catch (error) {
                console.error('❌ [SCREEN SHARE] - Error replacing track:', error);
              }
            }
          });
        }
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true, 
          audio: true 
        });
        
        if (!isMountedRef.current) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        setScreenStream(stream);
        setIsSharingScreen(true);
        
        const screenTrack = stream.getVideoTracks()[0];
        peersRef.current.forEach(peer => {
          if (!peer.destroyed && peer.streams?.[0]) {
            try {
              peer.replaceTrack(
                peer.streams[0].getVideoTracks()[0] || null, 
                screenTrack, 
                peer.streams[0]
              );
            } catch (error) {
              console.error('❌ [SCREEN SHARE] - Error replacing track:', error);
            }
          }
        });
      } catch (error) { 
        console.error('❌ [SCREEN SHARE] - Error sharing screen:', error);
        toast({ 
          variant: 'destructive', 
          title: 'Erreur de partage d\'écran',
          description: 'Impossible de démarrer le partage d\'écran.'
        });
      }
    }
  }, [isSharingScreen, screenStream, localStream, toast]);

  // CORRECTION: Hook principal Ably avec gestion correcte des dépendances
  useEffect(() => {
    if (!sessionId || !currentUserId || !ablyClient || ablyLoading || !isAblyConnected) {
        console.log(`⏳ [SESSION CLIENT] - Skipping Ably setup:`, {
            hasSessionId: !!sessionId,
            hasUserId: !!currentUserId,
            hasAblyClient: !!ablyClient,
            ablyLoading,
            isAblyConnected
        });
        return;
    }

    const channelName = getSessionChannelName(sessionId);
    const channel = ablyClient.channels.get(channelName);
    channelRef.current = channel;
  
    console.log(`📡 [SESSION CLIENT] - Setting up session: ${sessionId} for user: ${currentUserId}, connection state: ${isAblyConnected ? 'connected' : 'connecting'}`);
  
    const handleSignal = (message: Types.Message) => {
        if (!isMountedRef.current) return;
        
        const data = message.data as IncomingSignalData;
        if (data.target !== currentUserId) return;
        
        let peer = peersRef.current.get(data.userId);
        if (!peer) {
            const shouldHaveInitiated = currentUserId > data.userId;
            if (shouldHaveInitiated) return;
            
            const streamToUse = isSharingScreen ? screenStream : localStream;
            peer = createPeer(data.userId, false, streamToUse);
        }
        
        if (peer && !peer.destroyed) {
          peer.signal(data.signal);
        }
    };

    const handleSessionEnded = () => {
        if (!isMountedRef.current) return;
        toast({ 
          title: 'Session terminée', 
          description: 'Le professeur a mis fin à la session.' 
        });
        router.push(currentUserRole === Role.PROFESSEUR ? '/teacher/dashboard' : '/student/dashboard');
    };

    const handlePresenceUpdate = async (member: Types.PresenceMessage) => {
        if (!isMountedRef.current) return;
        
        try {
          const members = await channel.presence.get();
          const memberIds = Array.isArray(members) ? members.map((m: Types.PresenceMessage) => m.clientId) : [];                 
          setOnlineUserIds(memberIds);
          
          const otherUserIds = memberIds.filter((id: string) => id !== currentUserId);
          
          // CORRECTION: Créer un peer pour chaque autre utilisateur, seulement si on est l'initiateur.
          otherUserIds.forEach((userId: string) => {
              const shouldInitiate = currentUserId > userId;
              if (shouldInitiate && !peersRef.current.has(userId)) {
                  console.log(`[PEER] Initiating connection to ${userId}`);
                  const streamToUse = isSharingScreen ? screenStream : localStream;
                  createPeer(userId, true, streamToUse);
              }
          });

          // Cleanup for users who left
          const offlineUserIds = Array.from(peersRef.current.keys()).filter(id => !memberIds.includes(id));
          offlineUserIds.forEach(cleanupPeerConnection);

        } catch (error) {
          console.error('❌ [PRESENCE] - Error updating presence:', error);
        }
    };

    const setupPresence = async () => {
        try {
            await channel.presence.subscribe(['enter', 'leave', 'update'], handlePresenceUpdate);
            
            const currentUserData = {
                name: currentUserRole === Role.PROFESSEUR ? teacherName : studentNames[currentUserId],
                role: currentUserRole,
            };
            
            await channel.presence.enter(currentUserData);
            const initialMembers = await channel.presence.get();
            setOnlineUserIds(Array.isArray(initialMembers) ? initialMembers.map((m: Types.PresenceMessage) => m.clientId) : []);
            
            console.log(`✅ [SESSION CLIENT] - Successfully entered presence for session: ${sessionId}`);
        } catch (error) { 
            console.error("❌ [SESSION CLIENT] - Presence setup failed:", error);
        }
    };

    const handleWhiteboardOperations = (message: Types.Message) => {
        if (!isMountedRef.current) return;
        const data = message.data;
        if (data.userId !== currentUserId && Array.isArray(data.operations)) {
            handleIncomingWhiteboardOperations(data.operations);
        }
    };

    const bindEvents = () => {
        channel.subscribe(AblyEvents.SIGNAL, handleSignal);
        channel.subscribe(AblyEvents.SESSION_ENDED, handleSessionEnded);
        channel.subscribe(AblyEvents.PARTICIPANT_SPOTLIGHTED, (msg) => {
          if (isMountedRef.current) setSpotlightedParticipantId(msg.data.participantId);
        });
        channel.subscribe(AblyEvents.HAND_RAISE_UPDATE, (msg) => {
          if (isMountedRef.current) {
            setRaisedHands(prev => {
                const newSet = new Set(prev);
                msg.data.isRaised ? newSet.add(msg.data.userId) : newSet.delete(msg.data.userId);
                return newSet;
            });
          }
        });
        channel.subscribe(AblyEvents.UNDERSTANDING_UPDATE, (msg) => {
          if (isMountedRef.current) {
            setUnderstandingStatus(prev => new Map(prev).set(msg.data.userId, msg.data.status));
          }
        });
        channel.subscribe(AblyEvents.ACTIVE_TOOL_CHANGED, (msg) => {
          if (isMountedRef.current) {
            const validTools = ['camera', 'whiteboard', 'document', 'screen', 'chat', 'participants', 'quiz'];
            const validatedTool = validTools.includes(msg.data.tool) ? msg.data.tool : 'camera';
            setActiveTool(validatedTool);
          }
        });
        channel.subscribe(AblyEvents.DOCUMENT_SHARED, (msg) => {
          if (isMountedRef.current) {
            setDocumentUrl(msg.data.url);
            setDocumentHistory(prev => [...prev, msg.data]);
            setActiveTool('document');
            toast({ title: 'Document partagé', description: 'Le professeur a partagé un nouveau document.' });
          }
        });
        channel.subscribe(AblyEvents.WHITEBOARD_CONTROLLER_UPDATE, (msg) => {
          if (isMountedRef.current) setWhiteboardControllerId(msg.data.controllerId);
        });
        channel.subscribe(AblyEvents.WHITEBOARD_OPERATION_BATCH, handleWhiteboardOperations);
        channel.subscribe(AblyEvents.TIMER_STARTED, () => {
          if (isMountedRef.current) setIsTimerRunning(true);
        });
        channel.subscribe(AblyEvents.TIMER_PAUSED, () => {
          if (isMountedRef.current) setIsTimerRunning(false);
        });
        channel.subscribe(AblyEvents.TIMER_RESET, (msg) => {
          if (isMountedRef.current) {
            const duration = validateTimerDuration(msg.data.duration);
            setIsTimerRunning(false);
            setTimerTimeLeft(duration);
            setTimerDuration(duration);
          }
        });
    };

    setupPresence();
    bindEvents();

    console.log(`✅ [SESSION CLIENT] - Successfully set up Ably subscriptions for session: ${sessionId}`);

    return () => {
      console.log(`🧹 [SESSION CLIENT] - Cleaning up session: ${sessionId}`);
      
      Array.from(peersRef.current.keys()).forEach(cleanupPeerConnection);
      peersRef.current.clear();
      
      if (channelRef.current) {
        try {
          channelRef.current.presence.leave();
          channelRef.current.unsubscribe();
        } catch (error) {
          console.warn('⚠️ [CLEANUP] - Error cleaning up Ably channel:', error);
        }
        channelRef.current = null;
      }
    };
  }, [
    sessionId, 
    currentUserId, 
    ablyClient, 
    ablyLoading,
    isAblyConnected,
    currentUserRole,
    teacherName,
    studentNames,
    isSharingScreen,
    screenStream,
    localStream,
    createPeer,
    cleanupPeerConnection,
    router,
    toast,
    handleIncomingWhiteboardOperations
]);
  
  // Timer effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (isTimerRunning && timerTimeLeft > 0) {
      intervalId = setInterval(() => {
        setTimerTimeLeft(prev => Math.max(0, prev - 1));
      }, 1000);
    } else if (timerTimeLeft === 0) {
        setIsTimerRunning(false);
    }
    return () => { 
      if (intervalId) clearInterval(intervalId); 
    };
  }, [isTimerRunning, timerTimeLeft]);

  const toggleMute = useCallback(() => { 
    if (!localStream) return;
    
    localStream.getAudioTracks().forEach(track => { 
      track.enabled = !track.enabled; 
    }); 
    setIsMuted(prev => !prev);
  }, [localStream]);

  const toggleVideo = useCallback(() => { 
    if (!localStream) return;
    
    localStream.getVideoTracks().forEach(track => { 
      track.enabled = !track.enabled; 
    }); 
    setIsVideoOff(prev => !prev);
  }, [localStream]);

  // Reste des handlers avec useCallback pour éviter les re-renders
  const onSpotlightParticipant = useCallback((participantId: string) => {
    if (currentUserRole !== Role.PROFESSEUR) return;
    try {
      ablyTrigger(getSessionChannelName(sessionId), AblyEvents.PARTICIPANT_SPOTLIGHTED, { participantId });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de mettre le participant en vedette.' });
    }
  }, [sessionId, currentUserRole, toast]);
  
  const handleEndSession = useCallback(async () => {
    if (currentUserRole !== Role.PROFESSEUR) return;
    setIsEndingSession(true);
    try { 
      await endCoursSession(sessionId); 
    } catch (error) { 
      toast({ variant: 'destructive', title: 'Erreur' }); 
      setIsEndingSession(false); 
    }
  }, [currentUserRole, sessionId, toast]);

  const handleLeaveSession = useCallback(() => { 
    router.push(currentUserRole === Role.PROFESSEUR ? '/teacher/dashboard' : '/student/dashboard'); 
  }, [router, currentUserRole]);
  
  const handleStartTimer = useCallback(() => { 
    setIsTimerRunning(true); 
    broadcastTimerEvent(sessionId, 'timer-started'); 
  }, [sessionId]);

  const handlePauseTimer = useCallback(() => { 
    setIsTimerRunning(false); 
    broadcastTimerEvent(sessionId, 'timer-paused'); 
  }, [sessionId]);

  const handleResetTimer = useCallback((newDuration?: number) => {
    const duration = validateTimerDuration(newDuration ?? timerDuration);
    setIsTimerRunning(false);
    setTimerTimeLeft(duration);
    setTimerDuration(duration);
    broadcastTimerEvent(sessionId, 'timer-reset', { duration });
  }, [sessionId, timerDuration]);
  
  const handleToggleHandRaise = useCallback((isRaised: boolean) => {
    setRaisedHands(prev => { 
      const newSet = new Set(prev); 
      isRaised ? newSet.add(currentUserId) : newSet.delete(currentUserId); 
      return newSet; 
    });
    updateStudentSessionStatus(sessionId, { 
      isHandRaised: isRaised, 
      understanding: understandingStatus.get(currentUserId) || ComprehensionLevel.NONE 
    });
  }, [sessionId, currentUserId, understandingStatus]);
  
  const handleUnderstandingChange = useCallback((status: ComprehensionLevel) => {
    const newStatus = understandingStatus.get(currentUserId) === status ? ComprehensionLevel.NONE : status;
    setUnderstandingStatus(prev => new Map(prev).set(currentUserId, newStatus));
    updateStudentSessionStatus(sessionId, { 
      understanding: newStatus, 
      isHandRaised: raisedHands.has(currentUserId) 
    });
  }, [sessionId, currentUserId, understandingStatus, raisedHands]);

  const handleToolChange = useCallback((tool: string) => {
      setActiveTool(tool);
      if (currentUserRole === Role.PROFESSEUR) {
        broadcastActiveTool(sessionId, tool);
      }
  }, [sessionId, currentUserRole]);
  
  const handleWhiteboardControllerChange = useCallback((userId: string) => {
    if (currentUserRole === Role.PROFESSEUR) {
      const newControllerId = userId === whiteboardControllerId ? initialTeacher?.id || null : userId;
      ablyTrigger(getSessionChannelName(sessionId), AblyEvents.WHITEBOARD_CONTROLLER_UPDATE, { controllerId: newControllerId });
    }
  }, [sessionId, currentUserRole, whiteboardControllerId, initialTeacher?.id]);

  const handleWhiteboardEvent = useCallback((ops: WhiteboardOperation[]) => {
      // Directement mis à jour par handleIncomingWhiteboardOperations
      sendOperation(ops);
  }, [sendOperation]);

  // CORRECTION: useMemo pour les valeurs dérivées
  const spotlightedStream = useMemo(() => {
    if (!spotlightedParticipantId) return null;
    return spotlightedParticipantId === currentUserId ? 
      (isSharingScreen ? screenStream : localStream) : 
      remoteStreams.get(spotlightedParticipantId) || null;
  }, [spotlightedParticipantId, currentUserId, localStream, remoteStreams, isSharingScreen, screenStream]);
    
  const remoteParticipants = useMemo(() => 
    Array.from(remoteStreams.entries()).map(([id, stream]) => ({ id, stream })),
    [remoteStreams]
  );
    
  const spotlightedUser = useMemo(() => 
    [initialTeacher, ...initialStudents].find(u => u?.id === spotlightedParticipantId),
    [initialTeacher, initialStudents, spotlightedParticipantId]
  );

  // CORRECTION: État de chargement basé sur des conditions réelles
  const isComponentLoading = loading || ablyLoading || (!isAblyConnected && !!ablyClient);
  
  if (isComponentLoading) {
    return <SessionLoading />;
  }
  
  return (
    <div className="flex flex-col h-full bg-background p-4">
      <SessionHeader 
        sessionId={sessionId} 
        isTeacher={currentUserRole === Role.PROFESSEUR}
        onEndSession={handleEndSession}
        onLeaveSession={handleLeaveSession}
        isEndingSession={isEndingSession}
        isSharingScreen={isSharingScreen}
        onToggleScreenShare={toggleScreenShare}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        isVideoOff={isVideoOff}
        onToggleVideo={toggleVideo}
        activeTool={activeTool}
        onToolChange={handleToolChange}
      />
     <main className="flex-1 flex flex-col min-h-0 w-full pt-4">
        <PermissionPrompt />
        {currentUserRole === Role.PROFESSEUR ? (
          <TeacherSessionView
            sessionId={sessionId}
            localStream={localStream}
            screenStream={screenStream}
            remoteParticipants={remoteParticipants}
            spotlightedUser={spotlightedUser}
            allSessionUsers={[initialTeacher, ...initialStudents].filter(Boolean) as SessionParticipant[]}
            onlineUserIds={onlineUserIds}
            onSpotlightParticipant={onSpotlightParticipant}
            raisedHands={raisedHands}
            understandingStatus={understandingStatus}
            currentUserId={currentUserId}
            onScreenShare={toggleScreenShare}
            isSharingScreen={isSharingScreen}
            activeTool={activeTool}
            onToolChange={handleToolChange}
            classroom={classroom}
            documentUrl={documentUrl}
            documentHistory={documentHistory}
            whiteboardControllerId={whiteboardControllerId}
            onWhiteboardControllerChange={handleWhiteboardControllerChange}
            initialDuration={timerDuration}
            timerTimeLeft={timerTimeLeft}
            isTimerRunning={isTimerRunning}
            onStartTimer={handleStartTimer}
            onPauseTimer={handlePauseTimer}
            onResetTimer={handleResetTimer}
            onWhiteboardEvent={handleWhiteboardEvent}
            whiteboardOperations={whiteboardOperations}
            flushWhiteboardOperations={flushOperations}
          />
        ) : (
          <StudentSessionView
            sessionId={sessionId}
            localStream={localStream}
            spotlightedStream={spotlightedStream}
            spotlightedUser={spotlightedUser}
            isHandRaised={raisedHands.has(currentUserId)}
            onToggleHandRaise={handleToggleHandRaise}
            onUnderstandingChange={handleUnderstandingChange}
            onLeaveSession={handleLeaveSession}
            currentUnderstanding={understandingStatus.get(currentUserId) || ComprehensionLevel.NONE}
            currentUserId={currentUserId}
            activeTool={activeTool}
            documentUrl={documentUrl}
            whiteboardControllerId={whiteboardControllerId}
            timerTimeLeft={timerTimeLeft}
            onWhiteboardEvent={handleWhiteboardEvent}
            whiteboardOperations={whiteboardOperations}
            flushWhiteboardOperations={flushOperations}
            onlineMembersCount={onlineUserIds.length}
            isPresenceConnected={isAblyConnected}
          />
        )}
      </main>
    </div>
  );
}