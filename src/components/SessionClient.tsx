// src/components/SessionClient.tsx - VERSION FINALE WEBRTC & DATA CHANNELS
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Instance as PeerInstance, SignalData as PeerSignalData } from 'simple-peer';
import SimplePeer from 'simple-peer';
import { useToast } from '@/hooks/use-toast';
import type { User, Role } from '@prisma/client';
import type { SessionClientProps, IncomingSignalData, SignalPayload, SessionParticipant } from '@/types';
import { pusherClient } from '@/lib/pusher/client';
import SessionLoading from './SessionLoading';
import { TeacherSessionView } from './session/TeacherSessionView';
import { StudentSessionView } from './session/StudentSessionView';
import { SessionHeader } from './session/SessionHeader';
import { PermissionPrompt } from './PermissionPrompt';
import { endCoursSession, broadcastTimerEvent, broadcastActiveTool, updateStudentSessionStatus, shareDocument } from '@/lib/actions/session.actions';
import { ComprehensionLevel } from '@/types';
import { TLEditorSnapshot } from '@tldraw/tldraw';
import { useWhiteboardSync } from '@/hooks/useWhiteboardSync';

interface DocumentSharedEvent {
    name: string;
    url: string;
    sharedBy: string;
}

const INITIAL_TIMER_DURATION = 3600;

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
  
  const allSessionUsers: SessionParticipant[] = [initialTeacher, ...initialStudents];
  
  const peersRef = useRef<Map<string, PeerInstance>>(new Map());

  const {
      whiteboardSnapshot,
      setWhiteboardSnapshot,
      whiteboardControllerId,
      setWhiteboardControllerId,
      handleWhiteboardUpdate,
      broadcastWhiteboardUpdate,
      broadcastControllerChange,
  } = useWhiteboardSync(initialTeacher.id, peersRef, sessionId);

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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMute = (): void => {
    if (localStream) {
        localStream.getAudioTracks().forEach(track => { track.enabled = !track.enabled; });
        setIsMuted(prev => !prev);
    }
  };

  const toggleVideo = (): void => {
      if (localStream) {
          localStream.getVideoTracks().forEach(track => { track.enabled = !track.enabled; });
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
            return newMap;
        }
        return prev;
    });
  }, []);
  
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
        setRemoteStreams(prev => new Map(prev).set(targetUserId, remoteStream));
    });

    peer.on('data', handleWhiteboardUpdate);

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
  }, [sessionId, currentUserId, cleanupPeerConnection, localStream, handleWhiteboardUpdate]);

  useEffect(() => {
    if (!localStream) return;

    const channelName = `presence-session-${sessionId}`;
    const channel = pusherClient.subscribe(channelName);

    channel.bind('pusher:subscription_succeeded', (data: { members: Record<string, any> }) => {
        const memberIds = Object.keys(data.members);
        setOnlineUserIds(memberIds);
        const otherUserIds = memberIds.filter(id => id !== currentUserId);
        
        otherUserIds.forEach(userId => {
             if (currentUserId > userId) {
                createPeer(userId, true);
            }
        });
    });

    channel.bind('pusher:member_added', (member: { id: string }) => {
        setOnlineUserIds(prev => [...new Set([...prev, member.id])]);
        if (currentUserId > member.id) {
            createPeer(member.id, true);
        }
    });

    channel.bind('pusher:member_removed', (member: { id: string }) => {
        setOnlineUserIds(prev => prev.filter(id => id !== member.id));
        cleanupPeerConnection(member.id);
    });

    channel.bind('signal', (data: IncomingSignalData) => {
        if (data.target !== currentUserId) return;

        let peer = peersRef.current.get(data.userId);
        
        if (!peer) {
             if (data.isReturnSignal) return;
             peer = createPeer(data.userId, false);
        }
        
        if (peer && !peer.destroyed) {
            peer.signal(data.signal);
        }
    });

    const handleSessionEnded = (): void => {
        toast({ title: 'Session terminée', description: 'Le professeur a mis fin à la session.' });
        router.push(currentUserRole === 'PROFESSEUR' ? '/teacher/dashboard' : '/student/dashboard');
    };
    channel.bind('session-ended', handleSessionEnded);
    channel.bind('participant-spotlighted', (data: {participantId: string}) => setSpotlightedParticipantId(data.participantId));
    channel.bind('hand-raise-update', (data: {userId: string, isRaised: boolean}) => setRaisedHands(prev => new Set(data.isRaised ? [...prev, data.userId] : [...prev].filter(id => id !== data.userId))));
    channel.bind('understanding-update', (data: {userId: string, status: ComprehensionLevel}) => setUnderstandingStatus(prev => new Map(prev).set(data.userId, data.status)));
    channel.bind('timer-started', () => setIsTimerRunning(true));
    channel.bind('timer-paused', () => setIsTimerRunning(false));
    channel.bind('timer-reset', (data: {duration?: number}) => { setIsTimerRunning(false); const d = data.duration || INITIAL_TIMER_DURATION; setTimerTimeLeft(d); setTimerDuration(d); });
    channel.bind('active-tool-changed', (data: {tool: string}) => setActiveTool(data.tool));
    channel.bind('document-shared', (data: DocumentSharedEvent) => {
      setDocumentUrl(data.url);
      setDocumentHistory(prev => [...prev, { id: `doc-${Date.now()}`, name: data.name, url: data.url, createdAt: new Date(), coursSessionId: sessionId }]);
      setActiveTool('document');
      toast({ title: 'Document partagé', description: `Le professeur a partagé un nouveau document.` });
    });
    
    channel.bind('whiteboard-controller-update', (data: { controllerId: string }) => {
        setWhiteboardControllerId(data.controllerId);
    });

    return (): void => {
        console.log(`🔌 [PUSHER] Nettoyage des abonnements pour la session ${sessionId}`);
        channel.unbind_all();
        pusherClient.unsubscribe(channelName);
        peersRef.current.forEach((_, userId) => cleanupPeerConnection(userId));
        peersRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, currentUserId, createPeer, cleanupPeerConnection, router, toast, currentUserRole, setWhiteboardControllerId, localStream]);
  
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
      if (currentUserRole === 'PROFESSEUR') {
          const newControllerId = userId === whiteboardControllerId ? initialTeacher.id : userId;
          broadcastControllerChange(newControllerId);
      }
  };

  const spotlightedStream = spotlightedParticipantId === currentUserId 
    ? localStream 
    : remoteStreams.get(spotlightedParticipantId || '') || null;
    
  const remoteParticipants = Array.from(remoteStreams.entries()).map(([id, stream]) => ({ id, stream }));
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
            onWhiteboardPersist={broadcastWhiteboardUpdate}
            whiteboardSnapshot={whiteboardSnapshot}          />
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
            onWhiteboardPersist={broadcastWhiteboardUpdate}
          />
        )}
      </main>
    </div>
  );
}
