// src/components/SessionClient.tsx - VERSION AVEC HOOK WebRTC
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Instance as PeerInstance, SignalData as PeerSignalData } from 'simple-peer';
import { useToast } from '@/hooks/use-toast';
import { User, Role } from '@prisma/client';
import { SessionClientProps, IncomingSignalData, SignalPayload, SessionParticipant, DocumentInHistory, WhiteboardOperation, Quiz, QuizResponse, QuizResults, ComprehensionLevel } from '@/types';
import SessionLoading from './SessionLoading';
import { SessionHeader } from './session/SessionHeader';
import { PermissionPrompt } from './PermissionPrompt';
import { endCoursSession, shareDocumentToStudents, saveAndShareDocument } from '@/lib/actions/session.actions';
import { useAbly } from '@/hooks/useAbly';
import Ably, { type Types } from 'ably';
import { getSessionChannelName, getUserChannelName } from '@/lib/ably/channels';
import { AblyEvents } from '@/lib/ably/events';
import { ablyTrigger } from '@/lib/ably/triggers';
import { updateStudentSessionStatus, broadcastActiveTool, broadcastTimerEvent, startQuiz, submitQuizResponse, endQuiz } from '@/lib/actions/ably-session.actions';

// Importation du nouveau hook
import { useWebRTCConnection } from '@/hooks/session/useWebRTCConnection';

// Importation statique
import { TeacherSessionView } from './session/TeacherSessionView';
import { StudentSessionView } from './session/StudentSessionView';
import { useAblyWhiteboardSync } from '@/hooks/useAblyWhiteboardSync';


const validateTimerDuration = (duration: unknown): number => {
    if (typeof duration !== 'number' || isNaN(duration) || duration <= 0) {
        console.warn('⚠️ [TIMER] - Durée invalide détectée, utilisation de la valeur par défaut:', duration);
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
  initialActiveQuiz = null,
}: SessionClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  const isMountedRef = useRef(true);
  const setupCompletedRef = useRef(false);
  const mediaCleanupRef = useRef<(() => void) | null>(null);
  
  const { client: ablyClient, isConnected: isAblyConnected, connectionState } = useAbly();
  const ablyLoading = connectionState === 'initialized' || connectionState === 'connecting';  
  
  const [sessionReady, setSessionReady] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isSharingScreen, setIsSharingScreen] = useState<boolean>(false);
  const [isMediaReady, setIsMediaReady] = useState(false);
  
  // Utilisation du hook WebRTC
  const { remoteStreams, createPeer, cleanupPeerConnection } = useWebRTCConnection(sessionId, currentUserId, localStream, isMountedRef.current);

  useEffect(() => {
    if (ablyClient && isAblyConnected && sessionId && currentUserId) {
      setSessionReady(true);
    } else {
      setSessionReady(false);
    }
  }, [ablyClient, isAblyConnected, sessionId, currentUserId]);

  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [spotlightedParticipantId, setSpotlightedParticipantId] = useState<string | null>(initialTeacher?.id || null);
  const [handRaiseQueue, setHandRaiseQueue] = useState<string[]>([]);
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

  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(initialActiveQuiz);
  const [quizResponses, setQuizResponses] = useState<Map<string, QuizResponse>>(new Map());
  const [quizResults, setQuizResults] = useState<QuizResults | null>(null);
  
  const handleIncomingWhiteboardOperationsRef = useRef<(externalOps: WhiteboardOperation[]) => void>(() => {});
  const handlePresenceUpdateRef = useRef<(member: Types.PresenceMessage) => void>(() => {});
  const handleSignalRef = useRef<(message: Types.Message) => void>(() => {});
  
  useEffect(() => {
    handleIncomingWhiteboardOperationsRef.current = (externalOps: WhiteboardOperation[]) => {
      if (!isMountedRef.current) return;
      setWhiteboardOperations(prevOps => [...prevOps, ...externalOps]);
    };
  }, []);

  const { sendOperation, flushOperations } = useAblyWhiteboardSync(
    sessionId, 
    currentUserId, 
    (ops) => handleIncomingWhiteboardOperationsRef.current?.(ops)
  );
  
  const [whiteboardControllerId, setWhiteboardControllerId] = useState<string | null>(initialTeacher?.id || null);
  
  const channelRef = useRef<Ably.Types.RealtimeChannelCallbacks | null>(null);

  const teacherName = initialTeacher?.name || '';
  const studentNames = useMemo(() => 
    initialStudents.reduce((acc, student) => {
      if (student?.id && student?.name) acc[student.id] = student.name;
      return acc;
    }, {} as Record<string, string>),
    [initialStudents]
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`activeTool_${sessionId}`, activeTool);
    }
  }, [activeTool, sessionId]);
  
  useEffect(() => {
    if (setupCompletedRef.current) return;
    
    isMountedRef.current = true;
    setupCompletedRef.current = true;
    
    let stream: MediaStream | null = null;
    
    const getMedia = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720 }, 
          audio: true 
        });
        if (isMountedRef.current) {
          setLocalStream(stream);
          setIsMediaReady(true);
        }
      } catch (error) {
        if (isMountedRef.current) {
          setIsMediaReady(true); // Still ready, but in observer mode
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
      setupCompletedRef.current = false;
    };
  }, [sessionId, screenStream]);

  useEffect(() => {
    if (!screenStream) return;
    
    const handleTrackEnded = () => {
      if (isMountedRef.current) {
        setIsSharingScreen(false);
        setScreenStream(null);
      }
    };

    screenStream.getTracks().forEach(track => track.addEventListener('ended', handleTrackEnded));

    return () => screenStream.getTracks().forEach(track => track.removeEventListener('ended', handleTrackEnded));
  }, [screenStream]);

  const toggleScreenShare = useCallback(async () => {
    // La logique de remplacement de piste sera déplacée ici ou dans le hook WebRTC.
    // Pour l'instant, on se concentre sur l'extraction.
  }, []);

  useEffect(() => {
    handlePresenceUpdateRef.current = (member: Types.PresenceMessage) => {
      if (!isMountedRef.current || !channelRef.current) return;

      channelRef.current.presence.get((err, members) => {
          if (!isMountedRef.current || err) return;
          
          const uniqueMembers = Array.from(new Set(members.map(m => m.clientId)));
          setOnlineUserIds(uniqueMembers);
          
          const otherUserIds = uniqueMembers.filter(id => id !== currentUserId);
          
          if (currentUserRole === Role.PROFESSEUR && isMediaReady && sessionReady) {
              otherUserIds.forEach(userId => {
                  const streamToUse = isSharingScreen ? screenStream : localStream;
                  createPeer(userId, true, streamToUse);
              });
          }

          const currentPeerUserIds = Array.from(remoteStreams.keys());
          const offlineUserIds = currentPeerUserIds.filter(id => !uniqueMembers.includes(id));
          offlineUserIds.forEach(cleanupPeerConnection);
      });
    };
  }, [currentUserId, isMediaReady, isSharingScreen, screenStream, localStream, createPeer, cleanupPeerConnection, currentUserRole, sessionReady, remoteStreams]);

  useEffect(() => {
    handleSignalRef.current = (message: Types.Message) => {
        if (!isMountedRef.current) return;
        
        const data = message.data as IncomingSignalData;
        if (data.target !== currentUserId) return;
        
        let peer = remoteStreams.has(data.userId) ? undefined : createPeer(data.userId, false, isSharingScreen ? screenStream : localStream);
        
        if (peer) {
            try {
                peer.signal(data.signal);
            } catch (error) {
                console.error("Signal error:", error);
            }
        }
    };
  }, [currentUserId, isSharingScreen, screenStream, localStream, createPeer, remoteStreams]);
  
  const handleSessionEnded = useCallback(() => {
    if (!isMountedRef.current) return;
    toast({ title: 'Session terminée', description: 'Le professeur a mis fin à la session.' });
    router.push(currentUserRole === Role.PROFESSEUR ? '/teacher/dashboard' : '/student/dashboard');
  }, [router, currentUserRole, toast]);

  const handleSpotlight = useCallback((message: Types.Message) => {
    if (isMountedRef.current) setSpotlightedParticipantId(message.data.participantId);
  }, []);

  const handleHandRaiseUpdate = useCallback((message: Types.Message) => {
    if (!isMountedRef.current) return;
    const { userId, isRaised } = message.data;
    setHandRaiseQueue(prev => {
        const newQueue = prev.filter(id => id !== userId);
        if (isRaised) newQueue.push(userId);
        return newQueue;
      });
  }, []);

  const handleHandAcknowledged = useCallback((message: Types.Message) => {
    if (isMountedRef.current) setHandRaiseQueue(prev => prev.filter(id => id !== message.data.userId));
  }, []);

  const handleUnderstandingUpdate = useCallback((message: Types.Message) => {
    if (isMountedRef.current) setUnderstandingStatus(prev => new Map(prev).set(message.data.userId, message.data.status));
  }, []);

  const handleActiveToolChange = useCallback((message: Types.Message) => {
    if (isMountedRef.current) setActiveTool(validateActiveTool(message.data.tool));
  }, []);

  const handleDocumentShared = useCallback((message: Types.Message) => {
    if (!isMountedRef.current || message.data.sharedByUserId === currentUserId) return;
    setDocumentHistory(prev => [...prev, message.data]);
    setDocumentUrl(message.data.url);
    if (currentUserRole === Role.ELEVE) setActiveTool('document');
  }, [currentUserId, currentUserRole]);

  const handleDocumentDeleted = useCallback((message: Types.Message) => {
    if (isMountedRef.current) setDocumentHistory(prev => prev.filter(doc => doc.id !== message.data.documentId));
  }, []);

  const handleWhiteboardControllerUpdate = useCallback((message: Types.Message) => {
    if (isMountedRef.current) setWhiteboardControllerId(message.data.controllerId);
  }, []);

  const handleWhiteboardOperations = useCallback((message: Types.Message) => {
    if (isMountedRef.current && message.data.userId !== currentUserId) {
        handleIncomingWhiteboardOperationsRef.current?.(message.data.operations);
    }
  }, [currentUserId]);

  const handleTimerStarted = useCallback(() => {
    if (isMountedRef.current) setIsTimerRunning(true);
  }, []);

  const handleTimerPaused = useCallback(() => {
    if (isMountedRef.current) setIsTimerRunning(false);
  }, []);

  const handleTimerReset = useCallback((message: Types.Message) => {
    if (isMountedRef.current) {
      setTimerTimeLeft(validateTimerDuration(message.data.duration));
    }
  }, []);

  const handleQuizStarted = useCallback((message: Types.Message) => {
    if (isMountedRef.current) {
        setActiveQuiz(message.data.quiz);
        setQuizResults(null);
        setQuizResponses(new Map());
    }
  }, []);

  const handleQuizResponse = useCallback((message: Types.Message) => {
    if (isMountedRef.current) setQuizResponses(prev => new Map(prev).set(message.data.userId, message.data.response));
  }, []);

  const handleQuizEnded = useCallback((message: Types.Message) => {
    if (isMountedRef.current) {
        setActiveQuiz(null);
        setQuizResults(message.data.results);
    }
  }, []);

  useEffect(() => {
    if (!sessionReady || !ablyClient) return;

    const channelName = getSessionChannelName(sessionId);
    const channel = ablyClient.channels.get(channelName);
    channelRef.current = channel;

    const setupPresence = async () => {
        await channel.presence.subscribe(['enter', 'leave', 'update'], (member) => handlePresenceUpdateRef.current?.(member));
        await channel.presence.enter({ name: currentUserRole === Role.PROFESSEUR ? teacherName : studentNames[currentUserId], role: currentUserRole });
    };

    setupPresence();
    
    // ... (autres abonnements)

    return () => {
        // ... (logique de nettoyage)
    };
  }, [sessionReady, ablyClient, sessionId, currentUserRole, teacherName, studentNames, currentUserId]);
  
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (isTimerRunning && timerTimeLeft > 0) {
      intervalId = setInterval(() => setTimerTimeLeft(prev => Math.max(0, prev - 1)), 1000);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [isTimerRunning, timerTimeLeft]);

  const toggleMute = useCallback(() => { localStream?.getAudioTracks().forEach(track => { track.enabled = !track.enabled; }); setIsMuted(prev => !prev); }, [localStream]);
  const toggleVideo = useCallback(() => { localStream?.getVideoTracks().forEach(track => { track.enabled = !track.enabled; }); setIsVideoOff(prev => !prev); }, [localStream]);

  const onSpotlightParticipant = useCallback(async (participantId: string) => {
    if (currentUserRole === Role.PROFESSEUR) ablyTrigger(getSessionChannelName(sessionId), AblyEvents.PARTICIPANT_SPOTLIGHTED, { participantId });
  }, [sessionId, currentUserRole]);
  
  const handleEndSession = useCallback(async () => {
    if (currentUserRole === Role.PROFESSEUR) {
      setIsEndingSession(true);
      try { await endCoursSession(sessionId); } catch { setIsEndingSession(false); }
    }
  }, [currentUserRole, sessionId]);

  const handleLeaveSession = useCallback(() => router.push(currentUserRole === Role.PROFESSEUR ? '/teacher/dashboard' : '/student/dashboard'), [router, currentUserRole]);
  
  const handleToggleHandRaise = useCallback(async (isRaised: boolean) => { updateStudentSessionStatus(sessionId, { isHandRaised: isRaised }); }, [sessionId]);

  const handleAcknowledgeNextHand = useCallback(async () => {
    if (handRaiseQueue.length > 0) {
      await ablyTrigger(getSessionChannelName(sessionId), AblyEvents.HAND_ACKNOWLEDGED, { userId: handRaiseQueue[0] });
    }
  }, [sessionId, handRaiseQueue]);

  const handleUnderstandingChange = useCallback(async (status: ComprehensionLevel) => {
    updateStudentSessionStatus(sessionId, { understanding: status });
  }, [sessionId]);

  const onToolChange = useCallback(async (tool: string) => { broadcastActiveTool(sessionId, tool); }, [sessionId]);
  
  const handleWhiteboardControllerChange = useCallback(async (userId: string) => {
    if (currentUserRole === Role.PROFESSEUR) {
      const newControllerId = userId === whiteboardControllerId ? initialTeacher?.id || null : userId;
      await fetch(`/api/session/${sessionId}/whiteboard-controller`, { method: 'POST', body: JSON.stringify({ controllerId: newControllerId }) });
    }
  }, [sessionId, currentUserRole, whiteboardControllerId, initialTeacher?.id]);

  const handleWhiteboardEvent = useCallback((ops: WhiteboardOperation[]) => sendOperation(ops), [sendOperation]);

  const handleUploadSuccess = useCallback(async (uploadedDoc: { name: string; url: string }) => {
    try {
      await saveAndShareDocument(sessionId, uploadedDoc);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur' });
    }
  }, [sessionId, toast]);
  
  const spotlightedStream = useMemo(() => {
    return spotlightedParticipantId === currentUserId ? (isSharingScreen ? screenStream : localStream) : remoteStreams.get(spotlightedParticipantId || '');
  }, [spotlightedParticipantId, currentUserId, isSharingScreen, screenStream, localStream, remoteStreams]);
    
  const remoteParticipants = useMemo(() => Array.from(remoteStreams.entries()).map(([id, stream]) => ({ id, stream })), [remoteStreams]);
  const spotlightedUser = useMemo(() => [initialTeacher, ...initialStudents].find(u => u?.id === spotlightedParticipantId), [initialTeacher, initialStudents, spotlightedParticipantId]);

  const isComponentLoading = loading || ablyLoading || (!isAblyConnected && !!ablyClient);
  const isHandRaised = handRaiseQueue.includes(currentUserId);
  const raisedHandUsers = useMemo(() => handRaiseQueue.map(userId => allSessionUsers.find(u => u.id === userId)).filter(Boolean) as User[], [handRaiseQueue, allSessionUsers]);

  if (isComponentLoading) {
    return <SessionLoading />;
  }
  
  return (
    <div className="flex flex-col h-full bg-background p-4">
      <SessionHeader 
        sessionId={sessionId} isTeacher={currentUserRole === Role.PROFESSEUR}
        onEndSession={handleEndSession} onLeaveSession={handleLeaveSession}
        isEndingSession={isEndingSession} isSharingScreen={isSharingScreen}
        onToggleScreenShare={toggleScreenShare} isMuted={isMuted} onToggleMute={toggleMute}
        isVideoOff={isVideoOff} onToggleVideo={toggleVideo} 
        activeTool={activeTool} onToolChange={onToolChange} classroom={classroom}
      />
     <main className="flex-1 flex flex-col min-h-0 w-full pt-4">
        <PermissionPrompt />
        {currentUserRole === Role.PROFESSEUR ? (
          <TeacherSessionView
            sessionId={sessionId} localStream={localStream} screenStream={screenStream}
            remoteParticipants={remoteParticipants as { id: string; stream: MediaStream; }[]} 
            spotlightedUser={spotlightedUser} allSessionUsers={allSessionUsers as SessionParticipant[]}
            onlineUserIds={onlineUserIds} onSpotlightParticipant={onSpotlightParticipant} 
            raisedHandQueue={raisedHandUsers} onAcknowledgeNextHand={handleAcknowledgeNextHand}
            understandingStatus={understandingStatus} currentUserId={currentUserId} 
            isSharingScreen={isSharingScreen} activeTool={activeTool} onToolChange={onToolChange}
            classroom={classroom} documentUrl={documentUrl} onSelectDocument={(doc) => setDocumentUrl(doc.url)}
            whiteboardControllerId={whiteboardControllerId} onWhiteboardControllerChange={handleWhiteboardControllerChange}
            initialDuration={INITIAL_TIMER_DURATION} timerTimeLeft={timerTimeLeft} 
            isTimerRunning={isTimerRunning} onStartTimer={() => broadcastTimerEvent(sessionId, 'timer-started')}
            onPauseTimer={() => broadcastTimerEvent(sessionId, 'timer-paused')} onResetTimer={(duration) => broadcastTimerEvent(sessionId, 'timer-reset', { duration })}
            onWhiteboardEvent={handleWhiteboardEvent} whiteboardOperations={whiteboardOperations} 
            flushWhiteboardOperations={flushOperations} documentHistory={documentHistory}
            onDocumentShared={handleUploadSuccess} activeQuiz={activeQuiz}
            quizResponses={quizResponses} quizResults={quizResults}
            onStartQuiz={(quiz) => startQuiz(sessionId, quiz)}
            onEndQuiz={(quizId) => endQuiz(sessionId, quizId)} students={initialStudents}
          />
        ) : (
          <StudentSessionView
            sessionId={sessionId} localStream={localStream} spotlightedStream={spotlightedStream}
            spotlightedUser={spotlightedUser} isHandRaised={isHandRaised}
            onToggleHandRaise={() => handleToggleHandRaise(!isHandRaised)} onUnderstandingChange={handleUnderstandingChange}
            onLeaveSession={handleLeaveSession} currentUnderstanding={understandingStatus.get(currentUserId) || ComprehensionLevel.NONE}
            currentUserId={currentUserId} activeTool={activeTool} documentUrl={documentUrl}
            whiteboardControllerId={whiteboardControllerId} timerTimeLeft={timerTimeLeft}
            onWhiteboardEvent={handleWhiteboardEvent} whiteboardOperations={whiteboardOperations} 
            flushWhiteboardOperations={flushOperations} onlineMembersCount={onlineUserIds.length} 
            isPresenceConnected={isAblyConnected} activeQuiz={activeQuiz}
            onSubmitQuizResponse={(response) => submitQuizResponse(sessionId, response)}
            quizResults={quizResults}
          />
        )}
      </main>
    </div>
  );
}
