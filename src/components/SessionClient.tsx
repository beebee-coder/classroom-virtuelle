// src/components/SessionClient.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Instance as PeerInstance, SignalData as PeerSignalData } from 'simple-peer';
import SimplePeer from 'simple-peer';

import { pusherClient } from '@/lib/pusher/client';
import { useToast } from '@/hooks/use-toast';
import { User, Role, SessionParticipant, ClassroomWithDetails, DocumentInHistory } from '@/lib/types';
import SessionLoading from './SessionLoading';
import { TeacherSessionView } from './session/TeacherSessionView';
import { StudentSessionView } from './session/StudentSessionView';
import { SessionHeader } from './session/SessionHeader';
import { PermissionPrompt } from './PermissionPrompt';
import { endCoursSession, broadcastTimerEvent, broadcastActiveTool, broadcastWhiteboardController, broadcastWhiteboardUpdate, updateStudentSessionStatus } from '@/lib/actions';
import { ComprehensionLevel } from './StudentSessionControls';
import { SessionClientProps, PeerData, SignalPayload, PusherSubscriptionSucceededEvent, PusherMemberEvent, IncomingSignalData, SpotlightEvent, HandRaiseEvent, UnderstandingEvent, TimerEvent, ToolEvent, DocumentEvent, RemoteParticipant, WhiteboardUpdateEvent, WhiteboardControllerEvent } from '@/types';
import { TLEditorSnapshot, TLStoreSnapshot } from '@tldraw/tldraw';

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
  const [documentUrl, setDocumentUrl] = useState<string | null>(initialDocumentHistory.length > 0 ? initialDocumentHistory[initialDocumentHistory.length - 1].url : null);
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
  const peersRef = useRef<Map<string, PeerInstance>>(new Map());
  const pendingSignalsRef = useRef<Map<string, PeerSignalData[]>>(new Map());
  const screenPeerRef = useRef<PeerInstance | null>(null);
  
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
        console.log('✅ [MEDIA] - Flux local (caméra/micro) obtenu.');
      } catch (error) {
        console.error('❌ [MEDIA] - Erreur d\'accès à la caméra/micro:', error);
        toast({
          variant: 'destructive',
          title: 'Erreur Média',
          description: 'Impossible d\'accéder à votre caméra et/ou microphone.'
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

  const toggleMute = () => {
    if (localStream) {
        localStream.getAudioTracks().forEach(track => {
            track.enabled = !track.enabled;
        });
        setIsMuted(prev => !prev);
    }
  };

  const toggleVideo = () => {
      if (localStream) {
          localStream.getVideoTracks().forEach(track => {
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

  // ---=== 2. GESTION DES CONNEXIONS PEER-TO-PEER ===---
  const createPeer = useCallback((targetUserId: string, initiator: boolean): PeerInstance => {
    console.log(`🤝 [PEER] - Création d'un peer pour ${targetUserId}. Initiateur: ${initiator}`);
    
    const peer = new SimplePeer({
      initiator,
      trickle: false,
       config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    peer.on('signal', (signal: PeerSignalData) => {
      console.log(`📤 [PEER] -> Signal généré pour ${targetUserId}`);
      signalViaAPI({
        channelName: `presence-session-${sessionId}`,
        userId: currentUserId,
        target: targetUserId,
        signal,
        isReturnSignal: !initiator,
      });
    });
    
    peer.on('connect', () => {
      console.log(`🔗 [PEER] - Connexion établie avec ${targetUserId}`);
      if (localStream) {
        peer.addStream(localStream);
      }
    });

    peer.on('stream', (remoteStream: MediaStream) => {
      console.log(`📹 [PEER] <- Flux vidéo reçu de ${targetUserId}`);
      setRemoteStreams(prev => new Map(prev).set(targetUserId, remoteStream));
    });

    peer.on('error', (err: Error) => {
      console.error(`❌ [PEER] - Erreur de connexion avec ${targetUserId}:`, err);
    });

    peer.on('close', () => {
      console.log(`🔒 [PEER] - Connexion fermée avec ${targetUserId}`);
      peersRef.current.delete(targetUserId);
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        newMap.delete(targetUserId);
        return newMap;
      });
    });
    
    // Après la création, vérifier s'il y a des signaux en attente
    const pending = pendingSignalsRef.current.get(targetUserId);
    if (pending) {
        console.log(`🔄 [PEER] - Traitement de ${pending.length} signal(s) en attente pour ${targetUserId}.`);
        pending.forEach(signal => peer.signal(signal));
        pendingSignalsRef.current.delete(targetUserId);
    }

    return peer;
  }, [localStream, currentUserId, sessionId]);


  // ---=== 3. GESTION DES ÉVÉNEMENTS PUSHER ===---
  useEffect(() => {
    if (!sessionId || !localStream) {
      // Attendre que le flux local soit prêt avant de s'abonner
      return;
    };

    const channelName = `presence-session-${sessionId}`;
    console.log(`🔌 [PUSHER] - Abonnement au canal: ${channelName}`);
    
    const channel = pusherClient.subscribe(channelName);

    const handleSubscriptionSucceeded = (members: PusherSubscriptionSucceededEvent): void => {
      const otherUserIds = Object.keys(members.members || {}).filter(id => id !== currentUserId);
      setOnlineUserIds(Object.keys(members.members || {}));
      console.log(`✅ [PUSHER] - Abonnement réussi. ${otherUserIds.length} autre(s) participant(s) détecté(s).`);
      
      otherUserIds.forEach(userId => {
        const peer = createPeer(userId, true);
        peersRef.current.set(userId, peer);
      });
    };

    const handleMemberAdded = (member: PusherMemberEvent): void => {
      if (member.id === currentUserId) return;
      console.log(`➕ [PUSHER] - Nouveau participant: ${member.id}`);
      setOnlineUserIds(prev => [...prev, member.id]);

      const peer = createPeer(member.id, true);
      peersRef.current.set(member.id, peer);
    };
    
    const handleMemberRemoved = (member: PusherMemberEvent): void => {
      console.log(`➖ [PUSHER] - Participant parti: ${member.id}`);
      setOnlineUserIds(prev => prev.filter(id => id !== member.id));

      const peerToRemove = peersRef.current.get(member.id);
      if (peerToRemove) {
        peerToRemove.destroy();
      }
    };

    const handleSignal = (data: IncomingSignalData): void => {
        if (data.target !== currentUserId) return;
    
        console.log(`📡 [PUSHER] <- Signal reçu de ${data.userId}`);
        let peer = peersRef.current.get(data.userId);
    
        if (!peer) {
            console.log(`🆕 [PEER] - Peer non existant pour ${data.userId}. Création en réponse au signal.`);
            peer = createPeer(data.userId, false); // Créer en mode non-initiateur
            peersRef.current.set(data.userId, peer);
        }
    
        if (peer.destroyed) {
            console.error(`❌ [PEER] - Tentative d'envoyer un signal à un peer détruit pour ${data.userId}.`);
            return;
        }
    
        try {
            peer.signal(data.signal);
        } catch (error) {
            console.error(`💥 [PEER] - Erreur lors de l'application du signal pour ${data.userId}:`, error);
        }
    };
    
    const handleSessionEnded = (): void => {
      console.log('🔚 [PUSHER] - Événement de fin de session reçu.');
      toast({ title: 'Session terminée', description: 'Le professeur a mis fin à la session.' });
      router.push(currentUserRole === 'PROFESSEUR' ? '/teacher/dashboard' : '/student/dashboard');
    };

    const handleParticipantSpotlighted = (data: SpotlightEvent): void => {
      console.log(`🌟 [PUSHER] - Mise en vedette de ${data.participantId}`);
      setSpotlightedParticipantId(data.participantId);
    };

    const handleHandRaiseUpdate = (data: HandRaiseEvent): void => {
      console.log(`✋ [PUSHER] - Main ${data.isRaised ? 'levée' : 'baissée'} par ${data.userId}`);
      setRaisedHands(prev => {
        const newSet = new Set(prev);
        data.isRaised ? newSet.add(data.userId) : newSet.delete(data.userId);
        return newSet;
      });
    };

    const handleUnderstandingUpdate = (data: UnderstandingEvent): void => {
      console.log(`🤔 [PUSHER] - Statut de compréhension de ${data.userId} : ${data.status}`);
      setUnderstandingStatus(prev => new Map(prev).set(data.userId, data.status));
    };

    // --- Minuteur Events ---
    const handleTimerStarted = (): void => setIsTimerRunning(true);
    const handleTimerPaused = (): void => setIsTimerRunning(false);
    const handleTimerReset = (data: TimerEvent): void => {
      setIsTimerRunning(false);
      const newDuration = data.duration || INITIAL_TIMER_DURATION;
      setTimerTimeLeft(newDuration);
      setTimerDuration(newDuration);
    };

    // --- Outils Events ---
    const handleActiveToolChanged = (data: ToolEvent): void => {
      console.log(`[PUSHER] - Outil actif changé pour: ${data.tool}`);
      setActiveTool(data.tool);
    };
    const handleDocumentUpdated = (data: DocumentEvent & { newHistory: DocumentInHistory[] }): void => {
        console.log(`[PUSHER] - URL du document mise à jour: ${data.url}`);
        setDocumentUrl(data.url);
        if (data.newHistory) {
            setDocumentHistory(data.newHistory);
        }
        setActiveTool('document');
        toast({ title: 'Document partagé', description: 'Le professeur a partagé un nouveau document.' });
    };
    const handleWhiteboardUpdate = (data: WhiteboardUpdateEvent) => {
        if (data.senderId !== currentUserId) {
            console.log(`🎨 [PUSHER] - Mise à jour du tableau blanc reçue de ${data.senderId}`);
            setWhiteboardSnapshot(data.snapshot);
        }
    };
    const handleWhiteboardControllerUpdate = (data: WhiteboardControllerEvent) => {
        console.log(`🕹️ [PUSHER] - Contrôleur du tableau blanc mis à jour: ${data.controllerId}`);
        setWhiteboardControllerId(data.controllerId);
    };

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
    channel.bind('document-updated', handleDocumentUpdated);
    channel.bind('whiteboard-update', handleWhiteboardUpdate);
    channel.bind('whiteboard-controller-update', handleWhiteboardControllerUpdate);

    return (): void => {
      console.log(`🔌 [PUSHER] - Nettoyage des abonnements pour la session ${sessionId}`);
      peersRef.current.forEach(peer => peer.destroy());
      peersRef.current.clear();
      pusherClient.unsubscribe(channelName);
      channel.unbind_all();
    };
  }, [sessionId, localStream, currentUserId, router, toast, currentUserRole, createPeer]);
  
  // ---=== 4. GESTION DU CYCLE DE VIE ET INTERACTIONS ===---
  useEffect(() => {
    if (isTimerRunning && timerTimeLeft > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimerTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (!isTimerRunning || timerTimeLeft === 0) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
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
    console.log('🚪 [CLIENT] - Départ volontaire de la session.');
    router.push(currentUserRole === 'PROFESSEUR' ? '/teacher/dashboard' : '/student/dashboard');
  }, [router, currentUserRole]);
  
  const handleResetTimer = (newDuration?: number) => {
    const duration = newDuration || timerDuration;
    broadcastTimerEvent(sessionId, 'timer-reset', { duration });
  };

  const spotlightedStream = spotlightedParticipantId === currentUserId 
    ? localStream 
    : remoteStreams.get(spotlightedParticipantId || '') || null;

  if (loading) {
    return <SessionLoading />;
  }

  const handleToggleHandRaise = (isRaised: boolean) => {
        const newHandRaiseState = isRaised;
        setRaisedHands(prev => {
            const newSet = new Set(prev);
            newHandRaiseState ? newSet.add(currentUserId) : newSet.delete(currentUserId);
            return newSet;
        });
        updateStudentSessionStatus(sessionId, { isHandRaised: newHandRaiseState }).catch(() => {
             toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de mettre à jour le statut de la main levée.'});
             setRaisedHands(prev => {
                const newSet = new Set(prev);
                !newHandRaiseState ? newSet.add(currentUserId) : newSet.delete(currentUserId);
                return newSet;
            });
        });
  };
  const handleUnderstandingChange = (status: ComprehensionLevel) => {
       const newStatus = understandingStatus.get(currentUserId) === status ? ComprehensionLevel.NONE : status;
       setUnderstandingStatus(prev => new Map(prev).set(currentUserId, newStatus));
        updateStudentSessionStatus(sessionId, { understanding: newStatus }).catch(() => {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de mettre à jour le statut de compréhension.'});
            setUnderstandingStatus(prev => new Map(prev).set(currentUserId, understandingStatus.get(currentUserId) || ComprehensionLevel.NONE));
        });
  };
  const handleToolChange = (tool: string): void => {
    broadcastActiveTool(sessionId, tool);
  };
  const handleWhiteboardControllerChange = (userId: string) => {
    broadcastWhiteboardController(sessionId, userId);
  }

  const remoteParticipants: RemoteParticipant[] = Array.from(remoteStreams.entries()).map(([id, stream]) => ({ id, stream }));
  const spotlightedUser = allSessionUsers.find(u => u.id === spotlightedParticipantId);

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
      <main className="flex-1 flex flex-col min-h-0">
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
            onToggleHandRaise={handleToggleHandRaise}
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
