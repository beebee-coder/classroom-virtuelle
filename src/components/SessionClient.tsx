// src/components/SessionClient.tsx - VERSION FINALE CORRIGÉE AVEC WEBRTC STABLE
'use client';

import { useState, useEffect, useRef, useCallback }from 'react';
import { useRouter } from 'next/navigation';
import type { Instance as PeerInstance, SignalData as PeerSignalData } from 'simple-peer';
import SimplePeer from 'simple-peer';

import { pusherClient } from '@/lib/pusher/client';
import { useToast } from '@/hooks/use-toast';
import { User, Role } from '@prisma/client';
import type { SessionParticipant, ClassroomWithDetails, DocumentInHistory, RemoteParticipant } from '@/types';
import SessionLoading from './SessionLoading';
import { TeacherSessionView } from './session/TeacherSessionView';
import { StudentSessionView } from './session/StudentSessionView';
import { SessionHeader } from './session/SessionHeader';
import { PermissionPrompt } from './PermissionPrompt';
import { endCoursSession, broadcastTimerEvent, broadcastActiveTool, updateStudentSessionStatus, shareDocument } from '@/lib/actions/session.actions';
import { broadcastWhiteboardUpdate, broadcastWhiteboardController } from '@/lib/actions/whiteboard.actions';
import { ComprehensionLevel } from '@/lib/types';
import { SessionClientProps, PeerData, SignalPayload, PusherSubscriptionSucceededEvent, PusherMemberEvent, IncomingSignalData, SpotlightEvent, HandRaiseEvent, UnderstandingEvent, TimerEvent, ToolEvent, WhiteboardUpdateEvent, WhiteboardControllerEvent } from '@/types';
import { TLEditorSnapshot, TLStoreSnapshot } from '@tldraw/tldraw';

// Nouveau type pour l'événement de partage de document
interface DocumentSharedEvent {
    name: string;
    url: string;
    sharedBy: string;
}

const INITIAL_TIMER_DURATION = 3600; // 1 heure en secondes

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
  
  // États principaux
  const [loading, setLoading] = useState<boolean>(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [spotlightedParticipantId, setSpotlightedParticipantId] = useState<string | null>(initialTeacher?.id || null);
  
  // États d'interaction
  const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set());
  const [understandingStatus, setUnderstandingStatus] = useState<Map<string, ComprehensionLevel>>(new Map());
  const [isEndingSession, setIsEndingSession] = useState<boolean>(false);
  const [activeTool, setActiveTool] = useState<string>('whiteboard');
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentHistory, setDocumentHistory] = useState<DocumentInHistory[]>(initialDocumentHistory);
  const [whiteboardSnapshot, setWhiteboardSnapshot] = useState<TLEditorSnapshot | null>(null);
  const [whiteboardControllerId, setWhiteboardControllerId] = useState<string | null>(initialTeacher?.id || null);

  // Nouveaux états pour le contrôle média
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // États pour le minuteur
  const [timerDuration, setTimerDuration] = useState<number>(INITIAL_TIMER_DURATION);
  const [timerTimeLeft, setTimerTimeLeft] = useState<number>(timerDuration);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const allSessionUsers: SessionParticipant[] = [initialTeacher, ...initialStudents];
  
  // Références
  const peersRef = useRef<Map<string, PeerInstance>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);

  // ---=== 1. GESTION DES FLUX MÉDIAS ===---
  useEffect(() => {
    const getMedia = async (): Promise<void> => {
      console.log('🎬 [MEDIA] - Demande d\'accès à la caméra et au microphone...');
      try {
        const stream: MediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720 },
          audio: true 
        });
        setLocalStream(stream);
        localStreamRef.current = stream;
        console.log('✅ [MEDIA] - Flux local (caméra/micro) obtenu.');
      } catch (error) {
        console.error('❌ [MEDIA] - Erreur d\'accès à la caméra/micro:', error);
        toast({
          variant: 'destructive',
          title: 'Mode observateur activé',
          description: 'Impossible d\'accéder à votre caméra/micro. Vous pouvez suivre la session sans participer activement.'
        });
      } finally {
        setLoading(false);
      }
    };
    getMedia();

    return (): void => {
      console.log('🛑 [MEDIA] - Nettoyage des flux médias.');
      localStream?.getTracks().forEach(track => track.stop());
      screenStream?.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    };
  }, []);

  const toggleScreenShare = async (): Promise<void> => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
      if (screenPeerRef.current) {
        screenPeerRef.current.destroy();
        screenPeerRef.current = null;
      }
      toast({ title: 'Partage d\'écran arrêté' });
    } else {
      try {
        const stream: MediaStream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true,
          audio: true 
        });
        
        stream.getTracks().forEach(track => {
          track.onended = () => {
            setScreenStream(null);
            if (screenPeerRef.current) {
              screenPeerRef.current.destroy();
              screenPeerRef.current = null;
            }
            toast({ title: 'Partage d\'écran arrêté' });
          };
        });
        
        setScreenStream(stream);
        toast({ title: 'Partage d\'écran activé' });
      } catch (error) {
        console.log('Partage d\'écran annulé par l\'utilisateur');
      }
    }
  };

  const toggleMute = (): void => {
    if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => {
            track.enabled = !track.enabled;
        });
        setIsMuted(prev => !prev);
    }
  };

  const toggleVideo = (): void => {
      if (localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach(track => {
              track.enabled = !track.enabled;
          });
          setIsVideoOff(prev => !prev);
      }
  };

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
  }
  
  const screenPeerRef = useRef<PeerInstance | null>(null);

  // ---=== 2. GESTION DES CONNEXIONS PEER-TO-PEER (WEBRTC) - DÉFINITIVE & ROBUSTE ===---

  const cleanupPeerConnection = useCallback((userId: string) => {
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
            console.log(`- Flux distant de ${userId} supprimé.`);
            return newMap;
        }
        return prev;
    });
  }, []);
  
  // Ce `useEffect` est le cœur de la nouvelle logique WebRTC.
  // Il s'exécute chaque fois que la liste des utilisateurs en ligne change.
  useEffect(() => {
    if (!localStreamRef.current) return;

    const otherUserIds = onlineUserIds.filter(id => id !== currentUserId);

    otherUserIds.forEach(userId => {
        // La règle d'or pour éviter le "glare" : l'ID le plus petit initie.
        const shouldInitiate = currentUserId < userId;

        if (shouldInitiate && !peersRef.current.has(userId)) {
            console.log(`🤝 [PEER] Règle appliquée: J'initie la connexion vers ${userId} (mon ID est plus petit).`);
            const peer = createPeer(userId, true);
            peersRef.current.set(userId, peer);
        }
    });

  }, [onlineUserIds, currentUserId, localStreamRef.current]);


  const createPeer = useCallback((targetUserId: string, initiator: boolean): PeerInstance => {
    console.log(`[PEER] Création d'un peer vers ${targetUserId}. Initiateur: ${initiator}`);
    
    const peer = new SimplePeer({
        initiator,
        trickle: true, // trickle est plus performant pour un grand nombre de pairs.
        stream: localStreamRef.current ?? undefined,
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' }
            ]
        }
    });

    peer.on('signal', (signal: PeerSignalData) => {
        console.log(`📤 [PEER] -> Envoi du signal à ${targetUserId}.`);
        signalViaAPI({
            channelName: `presence-session-${sessionId}`,
            userId: currentUserId,
            target: targetUserId,
            signal,
            isReturnSignal: !initiator
        });
    });

    peer.on('stream', (remoteStream: MediaStream) => {
        console.log(`📹 [PEER] <- Flux vidéo reçu de ${targetUserId}.`);
        setRemoteStreams(prev => new Map(prev).set(targetUserId, remoteStream));
    });

    peer.on('error', (err: Error) => {
        console.error(`❌ [PEER] Erreur de connexion avec ${targetUserId}:`, err.name, err.message);
        cleanupPeerConnection(targetUserId);
    });

    peer.on('close', () => {
        console.log(`🔒 [PEER] Connexion fermée avec ${targetUserId}.`);
        cleanupPeerConnection(targetUserId);
    });

    return peer;
  }, [sessionId, currentUserId, cleanupPeerConnection]);


  // ---=== 3. GESTION DES ÉVÉNEMENTS PUSHER ===---
  useEffect(() => {
    if (!sessionId) return;
    
    const channelName = `presence-session-${sessionId}`;
    const channel = pusherClient.subscribe(channelName);

    console.log(`🔌 [PUSHER] - Abonnement au canal: ${channelName}`);
    
    const handleSubscriptionSucceeded = (data: PusherSubscriptionSucceededEvent): void => {
        const memberIds = Object.keys(data.members || {});
        setOnlineUserIds(memberIds);
        console.log(`✅ [PUSHER] Abonnement réussi. ${memberIds.length} participant(s) en ligne:`, memberIds);
    };

    const handleMemberAdded = (member: PusherMemberEvent): void => {
      console.log(`➕ [PUSHER] Nouveau participant: ${member.id}.`);
      setOnlineUserIds(prev => [...new Set([...prev, member.id])]);
    };

    const handleMemberRemoved = (member: PusherMemberEvent): void => {
        console.log(`➖ [PUSHER] Participant parti: ${member.id}.`);
        setOnlineUserIds(prev => prev.filter(id => id !== member.id));
        cleanupPeerConnection(member.id);
    };

    const handleSignal = (data: IncomingSignalData): void => {
        if (data.target !== currentUserId) return; // Ce signal n'est pas pour moi

        console.log(`📡 [PUSHER] <- Signal reçu de ${data.userId}.`);
        let peer = peersRef.current.get(data.userId);
        
        // Si c'est une offre et que je n'ai pas initié, je crée le peer pour répondre.
        if (data.signal.type === 'offer' && !peer) {
            const shouldIHaveInitiated = currentUserId < data.userId;
            if (shouldIHaveInitiated) {
                console.warn(`⚠️ [PEER] J'ai reçu une offre de ${data.userId}, mais j'aurais dû initier. Je l'ignore pour éviter le glare.`);
                return;
            }
            console.log(`[PEER] Réception d'une offre de ${data.userId}, création d'un peer non-initiateur pour répondre.`);
            peer = createPeer(data.userId, false);
            peersRef.current.set(data.userId, peer);
        }
        
        if (peer && !peer.destroyed) {
            peer.signal(data.signal);
        } else {
            console.warn(`⚠️ [PEER] Peer pour ${data.userId} non trouvé ou détruit. Signal ignoré.`);
        }
    };

    // ... autres gestionnaires d'événements ...
    const handleSessionEnded = (): void => {
        toast({ title: 'Session terminée', description: 'Le professeur a mis fin à la session.' });
        router.push(currentUserRole === 'PROFESSEUR' ? '/teacher/dashboard' : '/student/dashboard');
    };
    const handleParticipantSpotlighted = (data: SpotlightEvent): void => setSpotlightedParticipantId(data.participantId);
    const handleHandRaiseUpdate = (data: HandRaiseEvent): void => setRaisedHands(prev => new Set(data.isRaised ? [...prev, data.userId] : [...prev].filter(id => id !== data.userId)));
    const handleUnderstandingUpdate = (data: UnderstandingEvent): void => setUnderstandingStatus(prev => new Map(prev).set(data.userId, data.status));
    const handleTimerStarted = (): void => setIsTimerRunning(true);
    const handleTimerPaused = (): void => setIsTimerRunning(false);
    const handleTimerReset = (data: TimerEvent): void => { setIsTimerRunning(false); const d = data.duration || INITIAL_TIMER_DURATION; setTimerTimeLeft(d); setTimerDuration(d); };
    const handleActiveToolChanged = (data: ToolEvent): void => setActiveTool(data.tool);
    const handleDocumentShared = (data: DocumentSharedEvent): void => {
      setDocumentUrl(data.url);
      setDocumentHistory(prev => [...prev, { id: `doc-${Date.now()}`, name: data.name, url: data.url, createdAt: new Date(), coursSessionId: sessionId }]);
      setActiveTool('document');
      toast({ title: 'Document partagé', description: `Le professeur a partagé un nouveau document.` });
    };
    const handleWhiteboardUpdate = (data: WhiteboardUpdateEvent) => { if (data.senderId !== currentUserId) setWhiteboardSnapshot(data.snapshot); };
    const handleWhiteboardControllerUpdate = (data: WhiteboardControllerEvent) => setWhiteboardControllerId(data.controllerId);

    channel.bind('pusher:subscription_succeeded', handleSubscriptionSucceeded);
    channel.bind('pusher:member_added', handleMemberAdded);
    channel.bind('pusher:member_removed', handleMemberRemoved);
    channel.bind('signal', handleSignal);
    channel.bind('session-ended', handleSessionEnded);
    channel.bind('participant-spotlighted', handleParticipantSpotlighted);
    channel.bind('hand-raise-update', handleHandRaiseUpdate);
    channel.bind('understanding-update', handleUnderstandingUpdate);
    channel.bind('timer-started', handleTimerStarted);
    channel.bind('timer-paused', handleTimerPaused);
    channel.bind('timer-reset', handleTimerReset);
    channel.bind('active-tool-changed', handleActiveToolChanged);
    channel.bind('document-shared', handleDocumentShared);
    channel.bind('whiteboard-update', handleWhiteboardUpdate);
    channel.bind('whiteboard-controller-update', handleWhiteboardControllerUpdate);

    return (): void => {
        console.log(`🔌 [PUSHER] Nettoyage des abonnements pour la session ${sessionId}`);
        channel.unbind_all();
        pusherClient.unsubscribe(channelName);
        peersRef.current.forEach((_, userId) => cleanupPeerConnection(userId));
        peersRef.current.clear();
    };
  }, [sessionId, currentUserId, createPeer, cleanupPeerConnection, router, toast, currentUserRole]);
  
  // ---=== 4. GESTION DU CYCLE DE VIE ET INTERACTIONS ===---
  useEffect(() => {
    if (isTimerRunning && timerTimeLeft > 0) {
      timerIntervalRef.current = setInterval(() => setTimerTimeLeft(prev => prev - 1), 1000);
    } else if (!isTimerRunning || timerTimeLeft === 0) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [isTimerRunning, timerTimeLeft]);
  
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
  
  const handleResetTimer = (newDuration?: number): void => {
    broadcastTimerEvent(sessionId, 'timer-reset', { duration: newDuration || timerDuration });
  };

  const handleToggleHandRaise = (isRaised: boolean): void => {
        const newHandRaiseState = isRaised;
        setRaisedHands(prev => {
            const newSet = new Set(prev);
            newHandRaiseState ? newSet.add(currentUserId) : newSet.delete(currentUserId);
            return newSet;
        });
        updateStudentSessionStatus(sessionId, { isHandRaised: newHandRaiseState, understanding: understandingStatus.get(currentUserId) || ComprehensionLevel.NONE }).catch(() => {
             toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de mettre à jour le statut.'});
        });
  };

  const handleUnderstandingChange = (status: ComprehensionLevel): void => {
       const newStatus = understandingStatus.get(currentUserId) === status ? ComprehensionLevel.NONE : status;
       setUnderstandingStatus(prev => new Map(prev).set(currentUserId, newStatus));
       updateStudentSessionStatus(sessionId, { understanding: newStatus, isHandRaised: raisedHands.has(currentUserId) }).catch(() => {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de mettre à jour le statut.'});
       });
  };

  const handleToolChange = (tool: string): void => {
    setActiveTool(tool);
    if (currentUserRole === 'PROFESSEUR') {
      broadcastActiveTool(sessionId, tool);
    }
  };
  
  const handleWhiteboardControllerChange = (userId: string): void => {
    setWhiteboardControllerId(userId);
    if (currentUserRole === 'PROFESSEUR') {
      broadcastWhiteboardController(sessionId, userId);
    }
  };

  const spotlightedStream = spotlightedParticipantId === currentUserId 
    ? localStream 
    : remoteStreams.get(spotlightedParticipantId || '') || null;
    
  const remoteParticipants: RemoteParticipant[] = Array.from(remoteStreams.entries()).map(([id, stream]) => ({ id, stream }));
  const spotlightedUser = allSessionUsers.find(u => u.id === spotlightedParticipantId);

  if (loading) {
    return <SessionLoading />;
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <SessionHeader 
        sessionId={sessionId} 
        isTeacher={currentUserRole === 'PROFESSEUR'}
        onEndSession={handleEndSession}
        onLeaveSession={handleLeaveSession}
        isEndingSession={isEndingSession}
        isSharingScreen={!!screenStream}
        onToggleScreenShare={toggleScreenShare}
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
            screenStream={screenStream}
            remoteParticipants={remoteParticipants}
            spotlightedUser={spotlightedUser}
            allSessionUsers={allSessionUsers}
            onlineUserIds={onlineUserIds}
            onSpotlightParticipant={onSpotlightParticipant}
            raisedHands={raisedHands}
            understandingStatus={understandingStatus}
            currentUserId={currentUserId}
            onScreenShare={toggleScreenShare}
            isScreenSharing={!!screenStream}
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
          />
        ) : (
          <StudentSessionView
            sessionId={sessionId}
            localStream={localStream}
            spotlightedStream={spotlightedStream}
            spotlightedUser={spotlightedUser}
            isHandRaised={raisedHands.has(currentUserId)}
            onToggleHandRaise={() => handleToggleHandRaise(!raisedHands.has(currentUserId))}
            onUnderstandingChange={handleUnderstandingChange}
            onLeaveSession={handleLeaveSession}
            currentUnderstanding={understandingStatus.get(currentUserId) || ComprehensionLevel.NONE}
            currentUserId={currentUserId}
            activeTool={activeTool}
            documentUrl={documentUrl}
            whiteboardSnapshot={whiteboardSnapshot}
            whiteboardControllerId={whiteboardControllerId}
            timerTimeLeft={timerTimeLeft}
          />
        )}
      </main>
    </div>
  );
}
