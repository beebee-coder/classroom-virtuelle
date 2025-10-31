'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Instance as PeerInstance, SignalData as PeerSignalData } from 'simple-peer';
import SimplePeer from 'simple-peer';
import { useToast } from '@/hooks/use-toast';
import type { User, Role } from '@prisma/client';
import type { SessionClientProps, IncomingSignalData, SignalPayload, SessionParticipant, ExcalidrawScene } from '@/types';
import { getPusherClient } from '@/lib/pusher/client';
import SessionLoading from './SessionLoading';
import { TeacherSessionView } from './session/TeacherSessionView';
import { StudentSessionView } from './session/StudentSessionView';
import { SessionHeader } from './session/SessionHeader';
import { PermissionPrompt } from './PermissionPrompt';
import { endCoursSession, broadcastTimerEvent, broadcastActiveTool, updateStudentSessionStatus } from '@/lib/actions/session.actions';
import { ComprehensionLevel } from '@/types';
import { useWhiteboardSync } from '@/hooks/useWhiteboardSync';

interface DocumentSharedEvent {
    name: string;
    url: string;
    sharedBy: string;
}

const INITIAL_TIMER_DURATION = 3600;

// ⚠️ CORRECTION : Déplacer les fonctions hors du composant pour éviter les recréations
const signalViaAPI = async (payload: SignalPayload): Promise<void> => {
    try {
        await fetch('/api/pusher/signal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.error('❌ [SIGNAL] - Erreur d\'envoi du signal via API:', error);
    }
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
  
  const [loading, setLoading] = useState<boolean>(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [spotlightedParticipantId, setSpotlightedParticipantId] = useState<string | null>(initialTeacher?.id || null);
  
  const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set());
  const [understandingStatus, setUnderstandingStatus] = useState<Map<string, ComprehensionLevel>>(new Map());
  const [isEndingSession, setIsEndingSession] = useState<boolean>(false);
  const [activeTool, setActiveTool] = useState<string>('whiteboard');
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentHistory, setDocumentHistory] = useState(initialDocumentHistory);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const [timerDuration, setTimerDuration] = useState<number>(INITIAL_TIMER_DURATION);
  const [timerTimeLeft, setTimerTimeLeft] = useState<number>(timerDuration);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // ⚠️ CORRECTION : Utiliser useMemo pour éviter les recréations inutiles
  const allSessionUsers: SessionParticipant[] = useMemo(() => 
    [initialTeacher, ...initialStudents], 
    [initialTeacher, initialStudents]
  );
  
  const peersRef = useRef<Map<string, PeerInstance>>(new Map());
  const isMountedRef = useRef(true);

  // ⚠️ CORRECTION : Initialiser le hook whiteboard avec des dépendances stables
  const {
      sceneData: whiteboardScene,
      persistScene: persistWhiteboardScene,
  } = useWhiteboardSync(sessionId, null);
  
  const [whiteboardControllerId, setWhiteboardControllerId] = useState<string | null>(initialTeacher.id);
  
  // ⚠️ CORRECTION : useCallback stable pour whiteboard
  const handleWhiteboardPersist = useCallback((scene: ExcalidrawScene) => {
    console.log("🔄 [SessionClient] handleWhiteboardPersist appelé");
    persistWhiteboardScene(scene);
  }, [persistWhiteboardScene]);

  // ⚠️ CORRECTION : Nettoyage des connexions peer
  const cleanupPeerConnection = useCallback((userId: string): void => {
    const peer = peersRef.current.get(userId);
    if (peer) {
        console.log(`🧹 [PEER] Nettoyage de la connexion pour ${userId}.`);
        if (!peer.destroyed) {
            peer.destroy();
        }
        peersRef.current.delete(userId);
    }
    setRemoteStreams(prev => {
        const newMap = new Map(prev);
        if (newMap.has(userId)) {
            newMap.delete(userId);
            return newMap;
        }
        return prev;
    });
  }, []);

  // ⚠️ CORRECTION : useCallback stable pour createPeer
  const createPeer = useCallback((targetUserId: string, initiator: boolean): PeerInstance => {
    console.log(`[PEER] Création d'un peer vers ${targetUserId}. Initiateur: ${initiator}`);
    
    const peer = new SimplePeer({
        initiator,
        trickle: true,
        stream: localStream ?? undefined,
        config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
    });

    peer.on('signal', (signal: PeerSignalData) => {
        signalViaAPI({
            channelName: `presence-session-${sessionId}`,
            userId: currentUserId,
            target: targetUserId,
            signal,
            isReturnSignal: !initiator
        });
    });

    peer.on('stream', (remoteStream: MediaStream) => {
        if (isMountedRef.current) {
            setRemoteStreams(prev => new Map(prev).set(targetUserId, remoteStream));
        }
    });

    peer.on('error', (err: Error) => {
        console.error(`❌ [PEER] Erreur de connexion avec ${targetUserId}:`, err.name, err.message);
        cleanupPeerConnection(targetUserId);
    });

    peer.on('close', () => {
        console.log(`🔒 [PEER] Connexion fermée avec ${targetUserId}.`);
        cleanupPeerConnection(targetUserId);
    });
    
    peersRef.current.set(targetUserId, peer);
    return peer;
  }, [sessionId, currentUserId, localStream, cleanupPeerConnection]);

  // ⚠️ CORRECTION : Effet média séparé et simplifié
  useEffect(() => {
    isMountedRef.current = true;
    
    const getMedia = async (): Promise<void> => {
      console.log('🎬 [MEDIA] - Demande d\'accès à la caméra et au microphone...');
      try {
        const stream: MediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720 },
          audio: true 
        });
        if (isMountedRef.current) {
          setLocalStream(stream);
          console.log('✅ [MEDIA] - Flux local (caméra/micro) obtenu.');
        }
      } catch (error) {
        console.error('❌ [MEDIA] - Erreur d\'accès à la caméra/micro:', error);
        if (isMountedRef.current) {
          toast({
            variant: 'destructive',
            title: 'Mode observateur activé',
            description: 'Impossible d\'accéder à votre caméra/micro. Vous pouvez suivre la session sans participer activement.'
          });
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };
    getMedia();

    return (): void => {
      isMountedRef.current = false;
      console.log('🛑 [MEDIA] - Nettoyage des flux médias.');
      localStream?.getTracks().forEach(track => track.stop());
      screenStream?.getTracks().forEach(track => track.stop());
    };
  }, [toast]);

  // ⚠️ CORRECTION : Effet Pusher avec gestion de dépendances optimisée
  useEffect(() => {
    if (!sessionId || !currentUserId) return;

    const pusherClient = getPusherClient();
    const channelName = `presence-session-${sessionId}`;
    const channel = pusherClient.subscribe(channelName);

    const handleSubscriptionSucceeded = (data: { members: Record<string, any> }) => {
        if (!isMountedRef.current) return;
        
        const memberIds = Object.keys(data.members);
        setOnlineUserIds(memberIds);
        const otherUserIds = memberIds.filter(id => id !== currentUserId);
        
        otherUserIds.forEach(userId => {
             if (currentUserId > userId) {
                createPeer(userId, true);
            }
        });
    };

    const handleMemberAdded = (member: { id: string }) => {
        if (!isMountedRef.current) return;
        
        setOnlineUserIds(prev => [...new Set([...prev, member.id])]);
        if (currentUserId > member.id) {
            createPeer(member.id, true);
        }
    };

    const handleMemberRemoved = (member: { id: string }) => {
        if (!isMountedRef.current) return;
        
        setOnlineUserIds(prev => prev.filter(id => id !== member.id));
        cleanupPeerConnection(member.id);
    };

    const handleSignal = (data: IncomingSignalData) => {
        if (!isMountedRef.current || data.target !== currentUserId) return;

        let peer = peersRef.current.get(data.userId);
        
        if (!peer) {
             if (data.isReturnSignal) return;
             peer = createPeer(data.userId, false);
        }
        
        if (peer && !peer.destroyed) {
            peer.signal(data.signal);
        }
    };

    const handleSessionEnded = (): void => {
        if (!isMountedRef.current) return;
        
        toast({ title: 'Session terminée', description: 'Le professeur a mis fin à la session.' });
        router.push(currentUserRole === 'PROFESSEUR' ? '/teacher/dashboard' : '/student/dashboard');
    };

    // Bind des événements
    channel.bind('pusher:subscription_succeeded', handleSubscriptionSucceeded);
    channel.bind('pusher:member_added', handleMemberAdded);
    channel.bind('pusher:member_removed', handleMemberRemoved);
    channel.bind('signal', handleSignal);
    channel.bind('session-ended', handleSessionEnded);
    channel.bind('participant-spotlighted', (data: {participantId: string}) => {
        if (isMountedRef.current) {
            setSpotlightedParticipantId(data.participantId);
        }
    });
    channel.bind('hand-raise-update', (data: {userId: string, isRaised: boolean}) => {
        if (isMountedRef.current) {
            setRaisedHands(prev => new Set(data.isRaised ? [...prev, data.userId] : [...prev].filter(id => id !== data.userId)));
        }
    });
    channel.bind('understanding-update', (data: {userId: string, status: ComprehensionLevel}) => {
        if (isMountedRef.current) {
            setUnderstandingStatus(prev => new Map(prev).set(data.userId, data.status));
        }
    });
    channel.bind('timer-started', () => {
        if (isMountedRef.current) {
            setIsTimerRunning(true);
        }
    });
    channel.bind('timer-paused', () => {
        if (isMountedRef.current) {
            setIsTimerRunning(false);
        }
    });
    channel.bind('timer-reset', (data: {duration?: number}) => { 
        if (isMountedRef.current) {
            setIsTimerRunning(false); 
            const d = data.duration || INITIAL_TIMER_DURATION; 
            setTimerTimeLeft(d); 
            setTimerDuration(d); 
        }
    });
    channel.bind('active-tool-changed', (data: {tool: string}) => {
        if (isMountedRef.current) {
            setActiveTool(data.tool);
        }
    });
    channel.bind('document-shared', (data: DocumentSharedEvent) => {
      if (isMountedRef.current) {
          setDocumentUrl(data.url);
          setDocumentHistory(prev => [...prev, { 
              id: `doc-${Date.now()}`, 
              name: data.name, 
              url: data.url, 
              createdAt: new Date(), 
              coursSessionId: sessionId 
          }]);
          setActiveTool('document');
          toast({ title: 'Document partagé', description: `Le professeur a partagé un nouveau document.` });
      }
    });
    
    channel.bind('whiteboard-controller-update', (data: { controllerId: string }) => {
        if (isMountedRef.current) {
            setWhiteboardControllerId(data.controllerId);
        }
    });

    return (): void => {
        isMountedRef.current = false;
        console.log(`🔌 [PUSHER] Nettoyage des abonnements pour la session ${sessionId}`);
        
        // Nettoyer les connexions peer d'abord
        peersRef.current.forEach((_, userId) => cleanupPeerConnection(userId));
        peersRef.current.clear();
        
        // Puis désabonner Pusher
        channel.unbind('pusher:subscription_succeeded', handleSubscriptionSucceeded);
        channel.unbind('pusher:member_added', handleMemberAdded);
        channel.unbind('pusher:member_removed', handleMemberRemoved);
        channel.unbind('signal', handleSignal);
        channel.unbind('session-ended', handleSessionEnded);
        channel.unbind('participant-spotlighted');
        channel.unbind('hand-raise-update');
        channel.unbind('understanding-update');
        channel.unbind('timer-started');
        channel.unbind('timer-paused');
        channel.unbind('timer-reset');
        channel.unbind('active-tool-changed');
        channel.unbind('document-shared');
        channel.unbind('whiteboard-controller-update');
        
        pusherClient.unsubscribe(channelName);
    };
  }, [sessionId, currentUserId, createPeer, router, toast, currentUserRole, cleanupPeerConnection]);

  // ⚠️ CORRECTION : Timer effect avec gestion propre
  useEffect(() => {
    if (isTimerRunning && timerTimeLeft > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimerTimeLeft(prev => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isTimerRunning, timerTimeLeft]);
  
    const toggleMute = useCallback(() => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    }, [localStream]);

    const toggleVideo = useCallback(() => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOff(!videoTrack.enabled);
            }
        }
    }, [localStream]);

  // ⚠️ CORRECTION : Tous les handlers avec useCallback stable
  const onSpotlightParticipant = useCallback(async (participantId: string): Promise<void> => {
    if (currentUserRole !== 'PROFESSEUR') return;
    try {
      await fetch(`/api/session/${sessionId}/spotlight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId }),
      });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de mettre le participant en vedette.' });
    }
  }, [sessionId, currentUserRole, toast]);
  
  const handleEndSession = useCallback(async (): Promise<void> => {
    if (currentUserRole !== 'PROFESSEUR') return;
    setIsEndingSession(true);
    try {
      const result = await endCoursSession(sessionId);
      if (!result.success) throw new Error("L'action serveur a échoué.");
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de terminer la session.' });
      setIsEndingSession(false);
    }
  }, [currentUserRole, sessionId, toast]);

  const handleLeaveSession = useCallback((): void => {
    router.push(currentUserRole === 'PROFESSEUR' ? '/teacher/dashboard' : '/student/dashboard');
  }, [router, currentUserRole]);
  
  const handleResetTimer = useCallback((newDuration?: number): void => {
    broadcastTimerEvent(sessionId, 'timer-reset', { duration: newDuration || timerDuration });
  }, [sessionId, timerDuration]);

  const handleToggleHandRaise = useCallback((isRaised: boolean): void => {
    setRaisedHands(prev => {
      const newSet = new Set(prev);
      isRaised ? newSet.add(currentUserId) : newSet.delete(currentUserId);
      return newSet;
    });
    
    updateStudentSessionStatus(sessionId, { 
      isHandRaised: isRaised, 
      understanding: understandingStatus.get(currentUserId) || ComprehensionLevel.NONE 
    }).catch(() => {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de mettre à jour le statut.'});
    });
  }, [sessionId, currentUserId, understandingStatus, toast]);

  const handleUnderstandingChange = useCallback((status: ComprehensionLevel): void => {
    const newStatus = understandingStatus.get(currentUserId) === status ? ComprehensionLevel.NONE : status;
    setUnderstandingStatus(prev => new Map(prev).set(currentUserId, newStatus));
    
    updateStudentSessionStatus(sessionId, { 
      understanding: newStatus, 
      isHandRaised: raisedHands.has(currentUserId) 
    }).catch(() => {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de mettre à jour le statut.'});
    });
  }, [sessionId, currentUserId, understandingStatus, raisedHands, toast]);

  const handleToolChange = useCallback((tool: string): void => {
    setActiveTool(tool);
    if (currentUserRole === 'PROFESSEUR') {
      broadcastActiveTool(sessionId, tool);
    }
  }, [sessionId, currentUserRole]);
  
  const handleWhiteboardControllerChange = useCallback(async (userId: string) => {
    if (currentUserRole === 'PROFESSEUR') {
      const newControllerId = userId === whiteboardControllerId ? initialTeacher.id : userId;
      try {
        await fetch(`/api/session/${sessionId}/whiteboard-controller`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ controllerId: newControllerId }),
        });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de changer le contrôleur du tableau blanc.' });
      }
    }
  }, [sessionId, currentUserRole, whiteboardControllerId, initialTeacher.id, toast]);

  // ⚠️ CORRECTION : Utiliser useMemo pour les valeurs dérivées
  const spotlightedStream = useMemo(() => 
    spotlightedParticipantId === currentUserId 
      ? localStream 
      : remoteStreams.get(spotlightedParticipantId || '') || null,
    [spotlightedParticipantId, currentUserId, localStream, remoteStreams]
  );
    
  const remoteParticipants = useMemo(() => 
    Array.from(remoteStreams.entries()).map(([id, stream]) => ({ id, stream })),
    [remoteStreams]
  );
    
  const spotlightedUser = useMemo(() => 
    allSessionUsers.find(u => u.id === spotlightedParticipantId),
    [allSessionUsers, spotlightedParticipantId]
  );

  if (loading) {
    return <SessionLoading />;
  }
  
  console.log('🔄 [SessionClient] Rendu du composant principal.');

  return (
    <div className="flex flex-col h-screen bg-background">
      <SessionHeader 
        sessionId={sessionId} 
        isTeacher={currentUserRole === 'PROFESSEUR'}
        onEndSession={handleEndSession}
        onLeaveSession={handleLeaveSession}
        isEndingSession={isEndingSession}
        isSharingScreen={false}
        onToggleScreenShare={() => {}}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        isVideoOff={isVideoOff}
        onToggleVideo={toggleVideo}
        activeTool={activeTool}
        onToolChange={handleToolChange}
      />
     <main className="flex-1 flex flex-col min-h-0 w-full px-2">
        <PermissionPrompt />
        {currentUserRole === 'PROFESSEUR' ? (
          <TeacherSessionView
            sessionId={sessionId}
            localStream={localStream}
            screenStream={null}
            remoteParticipants={remoteParticipants}
            spotlightedUser={spotlightedUser}
            allSessionUsers={allSessionUsers}
            onlineUserIds={onlineUserIds}
            onSpotlightParticipant={onSpotlightParticipant}
            raisedHands={raisedHands}
            understandingStatus={understandingStatus}
            currentUserId={currentUserId}
            onScreenShare={() => { } }
            isScreenSharing={false}
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
            onStartTimer={() => broadcastTimerEvent(sessionId, 'timer-started')}
            onPauseTimer={() => broadcastTimerEvent(sessionId, 'timer-paused')}
            onResetTimer={handleResetTimer}
            onWhiteboardPersist={handleWhiteboardPersist}
            whiteboardScene={whiteboardScene}
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
            whiteboardScene={whiteboardScene}
            whiteboardControllerId={whiteboardControllerId}
            timerTimeLeft={timerTimeLeft}
            onWhiteboardPersist={handleWhiteboardPersist}
          />
        )}
      </main>
    </div>
  );
}
