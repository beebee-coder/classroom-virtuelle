
// src/components/SessionClient.tsx - VERSION CORRIGÉE AVEC SIGNAL HANDLER
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

// Importation des hooks de refactorisation
import { useWebRTCConnection } from '@/hooks/session/useWebRTCConnection';
import { useAblyCommunication } from '@/hooks/session/useAblyCommunication';
import { useMediaManagement } from '@/hooks/session/useMediaManagement';

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
  const [isEndingSession, setIsEndingSession] = useState<boolean>(false);
  
  const {
    localStream,
    screenStream,
    isSharingScreen,
    isMuted,
    isVideoOff,
    isMediaReady,
    isMediaLoading,
    toggleMute,
    toggleVideo,
    toggleScreenShare
  } = useMediaManagement();

  const activeStream = isSharingScreen ? screenStream : localStream;
  
  const {
    remoteStreams,
    createPeer,
    handleIncomingSignal: handleWebRTCSignal
  } = useWebRTCConnection(sessionId, currentUserId, activeStream, isMountedRef.current);
  
  // --- Handler pour les signaux WebRTC ---
  const handleSignalReceived = useCallback((fromUserId: string, signal: any) => {
    if (!isMountedRef.current) return;
    
    console.log(`🔧 [SIGNAL HANDLER] - Traitement du signal de ${fromUserId}`, {
      type: signal?.type,
      candidate: signal?.candidate ? 'présent' : 'absent',
      sdp: signal?.sdp ? 'présent' : 'absent'
    });
    
    // Transmettre le signal au hook WebRTC
    if (handleWebRTCSignal) {
      handleWebRTCSignal(fromUserId, signal);
    } else {
      console.warn('⚠️ [SIGNAL HANDLER] - Aucun handler WebRTC disponible');
    }
  }, [handleWebRTCSignal]);
  
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
    onSessionEnded: () => router.push(currentUserRole === Role.PROFESSEUR ? '/teacher/dashboard' : '/student/dashboard'),
    onSignalReceived: handleSignalReceived
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

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // --- Logique d'envoi et de réception de signaux WebRTC via le hook ---
  useEffect(() => {
    if (isMediaReady) {
        onlineUserIds.forEach(userId => {
            if (userId !== currentUserId) {
                createPeer(userId, true, activeStream);
            }
        });
    }
  }, [onlineUserIds, currentUserId, isMediaReady, activeStream, createPeer]);

  // --- Actions utilisateur ---
  const handleEndSession = useCallback(async () => {
    if (currentUserRole === Role.PROFESSEUR) {
      setIsEndingSession(true);
      try { 
        await endCoursSession(sessionId); 
      } catch (error) {
        console.error('❌ [SESSION END] - Erreur:', error);
        setIsEndingSession(false);
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: 'Impossible de terminer la session'
        });
      }
    }
  }, [currentUserRole, sessionId, toast]);

  const handleLeaveSession = useCallback(() => {
    router.push(currentUserRole === Role.PROFESSEUR ? '/teacher/dashboard' : '/student/dashboard');
  }, [router, currentUserRole]);
  
  const handleToggleHandRaise = useCallback(async (isRaised: boolean) => { 
    await updateStudentSessionStatus(sessionId, { isHandRaised: isRaised }); 
  }, [sessionId]);

  const handleAcknowledgeNextHand = useCallback(async () => {
    if (handRaiseQueue.length > 0) {
      await ablyTrigger(getSessionChannelName(sessionId), AblyEvents.HAND_ACKNOWLEDGED, { 
        userId: handRaiseQueue[0] 
      });
    }
  }, [sessionId, handRaiseQueue]);

  const handleUnderstandingChange = useCallback(async (status: ComprehensionLevel) => {
    await updateStudentSessionStatus(sessionId, { understanding: status });
  }, [sessionId]);

  const onToolChange = useCallback(async (tool: string) => { 
    setActiveTool(tool);
    await broadcastActiveTool(sessionId, tool); 
  }, [sessionId, setActiveTool]);
  
  const handleWhiteboardControllerChange = useCallback(async (userId: string) => {
    if (currentUserRole === Role.PROFESSEUR) {
      const newControllerId = userId === whiteboardControllerId ? initialTeacher?.id || null : userId;
      try {
        await fetch(`/api/session/${sessionId}/whiteboard-controller`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ controllerId: newControllerId }) 
        });
      } catch (error) {
        console.error('❌ [WHITEBOARD CONTROLLER] - Erreur:', error);
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: 'Impossible de changer le contrôleur du tableau blanc'
        });
      }
    }
  }, [sessionId, currentUserRole, whiteboardControllerId, initialTeacher?.id, toast]);

  const handleUploadSuccess = useCallback(async (uploadedDoc: { name: string; url: string }) => {
    try {
      await saveAndShareDocument(sessionId, uploadedDoc);
      toast({
        title: 'Succès',
        description: 'Document partagé avec la classe'
      });
    } catch (error) {
      console.error('❌ [DOCUMENT UPLOAD] - Erreur:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Erreur',
        description: 'Impossible de partager le document' 
      });
    }
  }, [sessionId, toast]);

  // --- Mémos pour l'affichage ---
  const allSessionUsers = useMemo(() => [initialTeacher, ...initialStudents].filter(Boolean) as User[], [initialTeacher, initialStudents]);
  const spotlightedUser = useMemo(() => allSessionUsers.find(u => u.id === spotlightedParticipantId), [allSessionUsers, spotlightedParticipantId]);
  const spotlightedStream = useMemo(() => (spotlightedParticipantId === currentUserId ? activeStream : remoteStreams.get(spotlightedParticipantId || '')) || null, [spotlightedParticipantId, currentUserId, activeStream, remoteStreams]);
  const remoteParticipants = useMemo(() => Array.from(remoteStreams.entries()).map(([id, stream]) => ({ id, stream })), [remoteStreams]);
  const isHandRaised = handRaiseQueue.includes(currentUserId);
  const raisedHandUsers = useMemo(() => handRaiseQueue.map(userId => allSessionUsers.find(u => u.id === userId)).filter(Boolean) as User[], [handRaiseQueue, allSessionUsers]);

  if (isMediaLoading) {
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
        onToolChange={onToolChange} 
        classroom={classroom}
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
            allSessionUsers={allSessionUsers as any[]}
            onlineUserIds={onlineUserIds} 
            onSpotlightParticipant={(id) => ablyTrigger(getSessionChannelName(sessionId), AblyEvents.PARTICIPANT_SPOTLIGHTED, { participantId: id })} 
            raisedHandQueue={raisedHandUsers} 
            onAcknowledgeNextHand={handleAcknowledgeNextHand}
            understandingStatus={understandingStatus} 
            currentUserId={currentUserId} 
            isSharingScreen={isSharingScreen} 
            activeTool={activeTool} 
            onToolChange={onToolChange}
            classroom={classroom} 
            documentUrl={documentUrl} 
            onSelectDocument={(doc) => setDocumentUrl(doc.url)}
            whiteboardControllerId={whiteboardControllerId} 
            onWhiteboardControllerChange={handleWhiteboardControllerChange}
            initialDuration={3600} 
            timerTimeLeft={timerTimeLeft} 
            isTimerRunning={isTimerRunning} 
            onStartTimer={() => broadcastTimerEvent(sessionId, 'timer-started')}
            onPauseTimer={() => broadcastTimerEvent(sessionId, 'timer-paused')} 
            onResetTimer={(duration) => broadcastTimerEvent(sessionId, 'timer-reset', { duration })}
            onWhiteboardEvent={sendOperation} 
            whiteboardOperations={whiteboardOperations} 
            flushWhiteboardOperations={flushOperations} 
            documentHistory={documentHistory}
            onDocumentShared={handleUploadSuccess} 
            activeQuiz={activeQuiz}
            quizResponses={quizResponses} 
            quizResults={quizResults}
            onStartQuiz={(quiz) => startQuiz(sessionId, quiz)}
            onEndQuiz={(quizId: string) => endQuiz(sessionId, quizId, quizResponses)} 
            students={initialStudents}
          />
        ) : (
          <StudentSessionView
            sessionId={sessionId} 
            localStream={localStream} 
            spotlightedStream={spotlightedStream}
            spotlightedUser={spotlightedUser} 
            isHandRaised={isHandRaised}
            onToggleHandRaise={() => handleToggleHandRaise(!isHandRaised)} 
            onUnderstandingChange={handleUnderstandingChange}
            onLeaveSession={handleLeaveSession} 
            currentUnderstanding={understandingStatus.get(currentUserId) || ComprehensionLevel.NONE}
            currentUserId={currentUserId} 
            activeTool={activeTool} 
            documentUrl={documentUrl}
            whiteboardControllerId={whiteboardControllerId} 
            timerTimeLeft={timerTimeLeft}
            onWhiteboardEvent={sendOperation} 
            whiteboardOperations={whiteboardOperations} 
            flushWhiteboardOperations={flushOperations} 
            onlineMembersCount={onlineUserIds.length} 
            isPresenceConnected={true} 
            activeQuiz={activeQuiz}
            onSubmitQuizResponse={(response) => submitQuizResponse(sessionId, response)}
            quizResults={quizResults}
          />
        )}
      </main>
    </div>
  );
}
