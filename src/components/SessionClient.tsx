// src/components/SessionClient.tsx
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';
import { User, Role } from '@prisma/client';
import { SessionDetails, ComprehensionLevel, WhiteboardOperation, QuizResponse, QuizResults, QuizWithQuestions, DocumentInHistory } from '@/types';
import SessionLoading from './SessionLoading';
import { SessionHeader } from './session/SessionHeader';
import { endCoursSession, saveAndShareDocument, getSessionDetails } from '@/lib/actions/session.actions';
import { ablyTrigger } from '@/lib/ably/triggers';
import { AblyEvents } from '@/lib/ably/events';
import { getSessionChannelName } from '@/lib/ably/channels';
import { updateStudentSessionStatus, broadcastActiveTool, broadcastTimerEvent, startQuiz, submitQuizResponse, endQuiz, closeQuiz } from '@/lib/actions/ably-session.actions';
import type { CreateQuizData } from '@/lib/actions/ably-session.actions';
import { useWebRTCConnection } from '@/hooks/session/useWebRTCConnection';
import { useAblyCommunication } from '@/hooks/session/useAblyCommunication';
import { useMediaManagement } from '@/hooks/session/useMediaManagement';
import { useSessionState } from '@/hooks/session/useSessionState';
import { TeacherSessionView } from './session/TeacherSessionView';
import { StudentSessionView } from './session/StudentSessionView';
import { useAblyWhiteboardSync } from '@/hooks/useAblyWhiteboardSync';
import type { SignalData as PeerSignalData } from 'simple-peer';
import { SessionErrorFallback } from './SessionErrorFallback';

// Déplacer la définition de l'interface ici
interface SessionClientWrapperProps {
  sessionId: string;
}

export default function SessionClientWrapper({ sessionId }: SessionClientWrapperProps) {
  const { data: userSession, status } = useSession();
  const [sessionData, setSessionData] = useState<SessionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      const fetchData = async () => {
        try {
          const data = await getSessionDetails(sessionId);
          if (!data) {
            setError("Session non trouvée ou accès non autorisé.");
          } else {
            setSessionData(data);
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : "Une erreur est survenue.");
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    } else if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=/session/${sessionId}`);
    }
  }, [sessionId, status, router]);

  if (loading || status === 'loading') {
    return <SessionLoading />;
  }

  if (error) {
    return <SessionErrorFallback error={error} sessionId={sessionId} />;
  }

  if (!sessionData) {
    return <SessionErrorFallback error="Données de session non disponibles." sessionId={sessionId} />;
  }

  return (
    <SessionClient
      sessionId={sessionData.id}
      initialStudents={sessionData.students}
      initialTeacher={sessionData.teacher}
      currentUserId={userSession!.user.id}
      currentUserRole={userSession!.user.role as Role}
      classroom={sessionData.classroom}
      initialDocumentHistory={sessionData.documentHistory}
      initialActiveQuiz={sessionData.activeQuiz}
    />
  );
}


interface SessionClientProps {
  sessionId: string;
  initialStudents: User[];
  initialTeacher: User;
  currentUserRole: Role;
  currentUserId: string;
  classroom: SessionDetails['classroom'];
  initialDocumentHistory?: DocumentInHistory[];
  initialActiveQuiz?: QuizWithQuestions | null;
}


function SessionClient({
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

  const { localStream, screenStream, isSharingScreen, isMuted, isVideoOff, isMediaReady, isMediaLoading, toggleMute, toggleVideo, startScreenShare, stopScreenShare } = useMediaManagement();
  
  const { remoteStreams, createPeer, handleIncomingSignal, cleanupPeerConnection, replaceTrackInPeers } = useWebRTCConnection(sessionId, currentUserId, localStream, isMountedRef.current);
  
  const {
    activeTool, documentUrl, documentHistory, whiteboardOperations, activeQuiz, quizResponses, quizResults,
    setActiveTool, setDocumentUrl, setDocumentHistory, setWhiteboardOperations, handleSelectDocument,
    handleUploadSuccess, handleStartQuiz, handleEndQuiz: useSessionStateEndQuiz, handleNewQuizResponse, handleCloseQuizResults: useSessionStateClose, handleQuizClosed,
  } = useSessionState({ initialDocumentHistory, initialActiveQuiz, sessionId });

  const handleSignalReceived = useCallback((fromUserId: string, signal: unknown, isReturnSignal?: boolean) => {
    if (!isMountedRef.current) return;
    try {
      handleIncomingSignal(fromUserId, signal as PeerSignalData, isReturnSignal);
    } catch (error) {
      console.error('❌ [SIGNAL HANDLER] - Erreur lors du traitement du signal:', error);
    }
  }, [handleIncomingSignal]);

  const {
    onlineUserIds, spotlightedParticipantId, handRaiseQueue, understandingStatus,
    whiteboardControllerId, isTimerRunning, timerTimeLeft, breakoutRoomInfo,
  } = useAblyCommunication({
    sessionId, currentUserId, initialTeacherId: initialTeacher.id,
    onSessionEnded: () => router.push(currentUserRole === Role.PROFESSEUR ? '/teacher/dashboard' : '/student/dashboard'),
    onSignalReceived: handleSignalReceived,
    setActiveTool, setDocumentUrl, setActiveQuiz: handleStartQuiz,
    onNewQuizResponse: handleNewQuizResponse, onQuizEnded: useSessionStateEndQuiz, onQuizClosed: handleQuizClosed,
  });

  const { sendOperation, flushOperations } = useAblyWhiteboardSync(
    sessionId, currentUserId, 
    useCallback((ops: WhiteboardOperation[]) => {
      if (isMountedRef.current) setWhiteboardOperations(prev => [...prev, ...ops]);
    }, [setWhiteboardOperations])
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!isMediaReady || !localStream || onlineUserIds.length === 0) return;

    if (currentUserRole === Role.PROFESSEUR) {
      const studentIds = (classroom?.eleves || []).map(s => s.id);
      const usersToConnect = onlineUserIds.filter(userId => 
        userId !== currentUserId && 
        studentIds.includes(userId) && 
        !remoteStreams.has(userId)
      );
      usersToConnect.forEach(userId => {
        createPeer(userId, true, localStream);
      });

      remoteStreams.forEach((_, userId) => {
        if (!onlineUserIds.includes(userId)) {
          cleanupPeerConnection(userId);
        }
      });
    }
  }, [onlineUserIds, currentUserId, isMediaReady, localStream, createPeer, remoteStreams, cleanupPeerConnection, currentUserRole, classroom?.eleves]);

  const allSessionUsers = useMemo(() => {
    const users = [initialTeacher];
    if (classroom?.eleves) {
      users.push(...classroom.eleves);
    }
    return users.filter(Boolean) as User[];
  }, [initialTeacher, classroom?.eleves]);
  
  const spotlightedUser = useMemo(() => spotlightedParticipantId ? allSessionUsers.find(u => u.id === spotlightedParticipantId) : undefined, [allSessionUsers, spotlightedParticipantId]);
  const spotlightedStream = useMemo(() => {
    if (!spotlightedParticipantId) return null;
    if (spotlightedParticipantId === currentUserId) return isSharingScreen ? screenStream : localStream;
    return remoteStreams.get(spotlightedParticipantId) || null;
  }, [spotlightedParticipantId, currentUserId, isSharingScreen, screenStream, localStream, remoteStreams]);

  const remoteParticipants = useMemo(() => Array.from(remoteStreams.entries()).map(([id, stream]) => ({ id, stream })), [remoteStreams]);
  const isHandRaised = useMemo(() => handRaiseQueue.includes(currentUserId), [handRaiseQueue, currentUserId]);
  const raisedHandUsers = useMemo(() => handRaiseQueue.map(userId => allSessionUsers.find(u => u.id === userId)).filter(Boolean) as User[], [handRaiseQueue, allSessionUsers]);

  const toggleScreenShare = useCallback(async () => {
    if (isSharingScreen) {
        stopScreenShare();
        const videoTrack = localStream?.getVideoTracks()[0] || null;
        replaceTrackInPeers(videoTrack, 'video');
    } else {
        const newScreenStream = await startScreenShare();
        if (newScreenStream) {
            const screenVideoTrack = newScreenStream.getVideoTracks()[0];
            replaceTrackInPeers(screenVideoTrack, 'video');
            // Gérer l'audio si nécessaire
            const screenAudioTrack = newScreenStream.getAudioTracks()[0];
            if (screenAudioTrack) {
                replaceTrackInPeers(screenAudioTrack, 'audio');
            }
        }
    }
  }, [isSharingScreen, startScreenShare, stopScreenShare, localStream, replaceTrackInPeers]);


  const handleEndSession = useCallback(async () => {
    if (currentUserRole !== Role.PROFESSEUR || isEndingSession) return;
    setIsEndingSession(true);
    try { 
      await endCoursSession(sessionId); 
      if (isMountedRef.current) toast({ title: 'Session terminée' }); 
    } catch (error) { 
      if (isMountedRef.current) { 
        setIsEndingSession(false); 
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de terminer la session' }); 
      } 
    }
  }, [currentUserRole, sessionId, toast, isEndingSession]);

  const handleLeaveSession = useCallback(() => router.push(currentUserRole === Role.PROFESSEUR ? '/teacher/dashboard' : '/student/dashboard'), [router, currentUserRole]);
  
  const handleToggleHandRaise = useCallback(async (isRaised: boolean) => {
    try { await updateStudentSessionStatus(sessionId, { isHandRaised: isRaised }); } 
    catch (error) { if (isMountedRef.current) toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de changer le statut de la main' }); }
  }, [sessionId, toast]);

  const handleAcknowledgeNextHand = useCallback(async () => {
    if (handRaiseQueue.length === 0) return;
    try { await ablyTrigger(getSessionChannelName(sessionId), AblyEvents.HAND_ACKNOWLEDGED, { userId: handRaiseQueue[0], timestamp: Date.now() }); } 
    catch (error) { if (isMountedRef.current) toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de reconnaître la main' }); }
  }, [sessionId, handRaiseQueue, toast]);

  const handleUnderstandingChange = useCallback(async (status: ComprehensionLevel) => {
    try { await updateStudentSessionStatus(sessionId, { understanding: status }); } 
    catch (error) { /* Gérer l'erreur */ }
  }, [sessionId]);

  const onToolChange = useCallback(async (tool: string) => {
    try { await broadcastActiveTool(sessionId, tool); } 
    catch (error) { /* Gérer l'erreur */ }
  }, [sessionId]);
  
  const handleWhiteboardControllerChange = useCallback(async (userId: string) => {
    if (currentUserRole !== Role.PROFESSEUR) return;
    const newControllerId = userId === whiteboardControllerId ? initialTeacher?.id || null : userId;
    try {
      const response = await fetch(`/api/session/${sessionId}/whiteboard-controller`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ controllerId: newControllerId }) });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    } catch (error) {
      if (isMountedRef.current) toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de changer le contrôleur' });
    }
  }, [sessionId, currentUserRole, whiteboardControllerId, initialTeacher?.id, toast]);

  const handleOnUploadSuccess = useCallback(async (uploadedDoc: { name: string; url: string }) => {
    if (!isMountedRef.current) return;
    try {
      const result = await saveAndShareDocument(sessionId, uploadedDoc);
      if (isMountedRef.current) { 
        handleUploadSuccess(result.document); 
        toast({ title: 'Succès', description: 'Document partagé' }); 
      }
    } catch (error) { 
      if (isMountedRef.current) toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de partager' }); 
    }
  }, [sessionId, toast, handleUploadSuccess]);
  
  const handleOnStartQuiz = useCallback(async (quizData: CreateQuizData) => {
    if (!isMountedRef.current) return { success: false, error: 'Composant non monté' };
    try {
      const result = await startQuiz(sessionId, quizData);
      if (!result.success && isMountedRef.current) toast({ variant: 'destructive', title: 'Erreur', description: result.error || 'Impossible de lancer le quiz.' });
      return result;
    } catch (error) {
      if (isMountedRef.current) toast({ variant: 'destructive', title: 'Erreur', description: 'Erreur inattendue' });
      return { success: false, error: 'Erreur inattendue' };
    }
  }, [sessionId, toast]);

  const handleSubmitQuizResponse = useCallback(async (response: QuizResponse) => {
    if (!isMountedRef.current) return { success: false, error: 'Composant non monté' };
    try {
      const result = await submitQuizResponse(sessionId, response);
      if (!result.success && isMountedRef.current) toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'envoyer vos réponses.' });
      return result;
    } catch (error) {
      if (isMountedRef.current) toast({ variant: 'destructive', title: 'Erreur', description: 'Erreur inattendue' });
      return { success: false, error: 'Erreur inattendue' };
    }
  }, [sessionId, toast]);

  const handleOnEndQuiz = useCallback(async (quizId: string, responses: Map<string, QuizResponse>) => {
    if (!isMountedRef.current) return { success: false, error: 'Composant non monté' };
    try {
      const result = await endQuiz(sessionId, quizId, responses);
      if (!result.success && isMountedRef.current) {
        toast({ variant: 'destructive', title: 'Erreur', description: result.error || 'Échec de la fin du quiz.' });
      }
      return result;
    } catch (error) {
      console.error('Erreur dans handleOnEndQuiz:', error);
      if (isMountedRef.current) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Échec lors de la fin du quiz.' });
      }
      return { success: false, error: 'Erreur inattendue' };
    }
  }, [sessionId, toast]);

  const handleOnCloseQuizResults = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      await closeQuiz(sessionId);
    } catch (error) {
      if (isMountedRef.current) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de fermer les résultats.' });
      }
    }
  }, [sessionId, toast]);

  if (isMediaLoading) return <SessionLoading />;

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
        {currentUserRole === Role.PROFESSEUR ? (
          <TeacherSessionView
            sessionId={sessionId}
            localStream={localStream}
            screenStream={screenStream}
            remoteParticipants={remoteParticipants}
            spotlightedUser={spotlightedUser}
            allSessionUsers={allSessionUsers}
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
            onSelectDocument={handleSelectDocument}
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
            onDocumentShared={handleOnUploadSuccess}
            activeQuiz={activeQuiz}
            quizResponses={quizResponses}
            quizResults={quizResults}
            onStartQuiz={handleOnStartQuiz}
            onEndQuiz={handleOnEndQuiz}
            onCloseResults={handleOnCloseQuizResults}
            students={classroom?.eleves || []}
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
            currentUserRole={currentUserRole} 
            classroomId={classroom?.id ?? null} 
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
            onSubmitQuizResponse={handleSubmitQuizResponse} 
            quizResults={quizResults}
            breakoutRoomInfo={breakoutRoomInfo} 
            allSessionUsers={allSessionUsers}
          />
        )}
      </main>
    </div>
  );
}
