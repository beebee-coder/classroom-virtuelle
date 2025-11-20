// src/components/SessionClient.tsx - VERSION AVEC HOOKS WebRTC & Ably
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Instance as PeerInstance, SignalData as PeerSignalData } from 'simple-peer';
import { useToast } from '@/hooks/use-toast';
import { User, Role } from '@prisma/client';
import { SessionClientProps, DocumentInHistory, WhiteboardOperation, Quiz, QuizResponse, QuizResults, ComprehensionLevel } from '@/types';
import SessionLoading from './SessionLoading';
import { SessionHeader } from './session/SessionHeader';
import { PermissionPrompt } from './PermissionPrompt';
import { endCoursSession, shareDocumentToStudents, saveAndShareDocument } from '@/lib/actions/session.actions';
import { ablyTrigger } from '@/lib/ably/triggers';
import { AblyEvents } from '@/lib/ably/events';
import { getSessionChannelName } from '@/lib/ably/channels';
import { updateStudentSessionStatus, broadcastActiveTool, broadcastTimerEvent, startQuiz, submitQuizResponse, endQuiz } from '@/lib/actions/ably-session.actions';

// Importation des nouveaux hooks
import { useWebRTCConnection } from '@/hooks/session/useWebRTCConnection';
import { useAblyCommunication } from '@/hooks/session/useAblyCommunication';

// Importation statique
import { TeacherSessionView } from './session/TeacherSessionView';
import { StudentSessionView } from './session/StudentSessionView';
import { useAblyWhiteboardSync } from '@/hooks/useAblyWhiteboardSync';


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
  const mediaCleanupRef = useRef<(() => void) | null>(null);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isSharingScreen, setIsSharingScreen] = useState<boolean>(false);
  const [isMediaReady, setIsMediaReady] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState<boolean>(false);
  
  // --- Utilisation des hooks de refactorisation ---
  const { remoteStreams, createPeer, cleanupPeerConnection } = useWebRTCConnection(sessionId, currentUserId, isSharingScreen ? screenStream : localStream, isMountedRef.current);
  
  const {
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
  } = useAblyCommunication({
    sessionId,
    currentUserId,
    initialTeacherId: initialTeacher.id,
    onSessionEnded: () => router.push(currentUserRole === Role.PROFESSEUR ? '/teacher/dashboard' : '/student/dashboard')
  });

  const { sendOperation, flushOperations } = useAblyWhiteboardSync(
    sessionId, 
    currentUserId, 
    (ops) => setWhiteboardOperations(prev => [...prev, ...ops])
  );

  const [documentHistory, setDocumentHistory] = useState(initialDocumentHistory);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(initialActiveQuiz);
  const [quizResponses, setQuizResponses] = useState<Map<string, QuizResponse>>(new Map());
  const [quizResults, setQuizResults] = useState<QuizResults | null>(null);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // --- Initialisation des médias ---
  useEffect(() => {
    isMountedRef.current = true;
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
          setIsMediaReady(true);
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    getMedia();
    
    mediaCleanupRef.current = () => stream?.getTracks().forEach(track => track.stop());

    return () => {
      isMountedRef.current = false;
      mediaCleanupRef.current?.();
    };
  }, []);

  // --- Gestion du cycle de vie du partage d'écran ---
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


  // --- Logique d'envoi et de réception de signaux WebRTC via le hook ---
  useEffect(() => {
    if (isMediaReady) {
        onlineUserIds.forEach(userId => {
            if (userId !== currentUserId) {
                createPeer(userId, true, isSharingScreen ? screenStream : localStream);
            }
        });
    }
  }, [onlineUserIds, currentUserId, isMediaReady, isSharingScreen, screenStream, localStream, createPeer]);


  // --- Actions utilisateur ---
  const toggleMute = useCallback(() => { localStream?.getAudioTracks().forEach(track => { track.enabled = !track.enabled; }); setIsMuted(prev => !prev); }, [localStream]);
  const toggleVideo = useCallback(() => { localStream?.getVideoTracks().forEach(track => { track.enabled = !track.enabled; }); setIsVideoOff(prev => !prev); }, [localStream]);
  
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

  const onToolChange = useCallback(async (tool: string) => { 
    setActiveTool(tool);
    broadcastActiveTool(sessionId, tool); 
  }, [sessionId, setActiveTool]);
  
  const handleWhiteboardControllerChange = useCallback(async (userId: string) => {
    if (currentUserRole === Role.PROFESSEUR) {
      const newControllerId = userId === whiteboardControllerId ? initialTeacher?.id || null : userId;
      await fetch(`/api/session/${sessionId}/whiteboard-controller`, { method: 'POST', body: JSON.stringify({ controllerId: newControllerId }) });
    }
  }, [sessionId, currentUserRole, whiteboardControllerId, initialTeacher?.id]);

  const handleUploadSuccess = useCallback(async (uploadedDoc: { name: string; url: string }) => {
    try {
      await saveAndShareDocument(sessionId, uploadedDoc);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur' });
    }
  }, [sessionId, toast]);

  // --- Mémos pour l'affichage ---
  const allSessionUsers = useMemo(() => [initialTeacher, ...initialStudents].filter(Boolean) as User[], [initialTeacher, initialStudents]);
  const spotlightedUser = useMemo(() => allSessionUsers.find(u => u.id === spotlightedParticipantId), [allSessionUsers, spotlightedParticipantId]);
  const spotlightedStream = useMemo(() => spotlightedParticipantId === currentUserId ? (isSharingScreen ? screenStream : localStream) : remoteStreams.get(spotlightedParticipantId || ''), [spotlightedParticipantId, currentUserId, isSharingScreen, screenStream, localStream, remoteStreams]);
  const remoteParticipants = useMemo(() => Array.from(remoteStreams.entries()).map(([id, stream]) => ({ id, stream })), [remoteStreams]);
  const isHandRaised = handRaiseQueue.includes(currentUserId);
  const raisedHandUsers = useMemo(() => handRaiseQueue.map(userId => allSessionUsers.find(u => u.id === userId)).filter(Boolean) as User[], [handRaiseQueue, allSessionUsers]);

  if (loading) {
    return <SessionLoading />;
  }

  return (
    <div className="flex flex-col h-full bg-background p-4">
      <SessionHeader 
        sessionId={sessionId} isTeacher={currentUserRole === Role.PROFESSEUR}
        onEndSession={handleEndSession} onLeaveSession={handleLeaveSession}
        isEndingSession={isEndingSession} isSharingScreen={isSharingScreen}
        onToggleScreenShare={() => { /* TODO: Implement screen share */ }} 
        isMuted={isMuted} onToggleMute={toggleMute}
        isVideoOff={isVideoOff} onToggleVideo={toggleVideo} 
        activeTool={activeTool} onToolChange={onToolChange} classroom={classroom}
      />
      <main className="flex-1 flex flex-col min-h-0 w-full pt-4">
        <PermissionPrompt />
        {currentUserRole === Role.PROFESSEUR ? (
          <TeacherSessionView
            sessionId={sessionId} localStream={localStream} screenStream={screenStream}
            remoteParticipants={remoteParticipants} 
            spotlightedUser={spotlightedUser} allSessionUsers={allSessionUsers as SessionParticipant[]}
            onlineUserIds={onlineUserIds} onSpotlightParticipant={(id) => ablyTrigger(getSessionChannelName(sessionId), AblyEvents.PARTICIPANT_SPOTLIGHTED, { participantId: id })} 
            raisedHandQueue={raisedHandUsers} onAcknowledgeNextHand={handleAcknowledgeNextHand}
            understandingStatus={understandingStatus} currentUserId={currentUserId} 
            isSharingScreen={isSharingScreen} activeTool={activeTool} onToolChange={onToolChange}
            classroom={classroom} documentUrl={documentUrl} onSelectDocument={(doc) => setDocumentUrl(doc.url)}
            whiteboardControllerId={whiteboardControllerId} onWhiteboardControllerChange={handleWhiteboardControllerChange}
            initialDuration={3600} timerTimeLeft={timerTimeLeft} 
            isTimerRunning={isTimerRunning} onStartTimer={() => broadcastTimerEvent(sessionId, 'timer-started')}
            onPauseTimer={() => broadcastTimerEvent(sessionId, 'timer-paused')} onResetTimer={(duration) => broadcastTimerEvent(sessionId, 'timer-reset', { duration })}
            onWhiteboardEvent={sendOperation} whiteboardOperations={whiteboardOperations} 
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
            onWhiteboardEvent={sendOperation} whiteboardOperations={whiteboardOperations} 
            flushWhiteboardOperations={flushOperations} onlineMembersCount={onlineUserIds.length} 
            isPresenceConnected={true} activeQuiz={activeQuiz}
            onSubmitQuizResponse={(response) => submitQuizResponse(sessionId, response)}
            quizResults={quizResults}
          />
        )}
      </main>
    </div>
  );
}
