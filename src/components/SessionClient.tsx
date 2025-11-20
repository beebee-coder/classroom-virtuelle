// src/components/SessionClient.tsx - VERSION FINALE CORRIGÉE
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
import type { CreateQuizData } from '@/lib/actions/ably-session.actions';

// Importation des hooks de refactorisation
import { useWebRTCConnection } from '@/hooks/session/useWebRTCConnection';
import { useAblyCommunication } from '@/hooks/session/useAblyCommunication';
import { useMediaManagement } from '@/hooks/session/useMediaManagement';
import { useSessionState } from '@/hooks/session/useSessionState';

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
    handleIncomingSignal
  } = useWebRTCConnection(sessionId, currentUserId, activeStream, isMountedRef.current);
  
  // CORRECTION : Gestion d'état de session
  const {
    activeTool,
    documentUrl,
    documentHistory,
    whiteboardOperations,
    activeQuiz,
    quizResponses,
    quizResults,
    setActiveTool,
    setDocumentUrl,
    setDocumentHistory,
    setWhiteboardOperations,
    handleSelectDocument,
    handleUploadSuccess,
    handleStartQuiz,
    handleEndQuiz,
    handleNewQuizResponse,
  } = useSessionState({ initialDocumentHistory, initialActiveQuiz });

  // CORRECTION : Handler de signal avec validation
  const handleSignalReceived = useCallback((fromUserId: string, signal: any) => {
    if (!isMountedRef.current) return;
    
    console.log(`🔧 [SIGNAL HANDLER] - Traitement du signal de ${fromUserId} vers ${currentUserId}`);
    
    // CORRECTION : Validation du signal
    if (!signal || typeof signal !== 'object') {
      console.warn('⚠️ [SIGNAL HANDLER] - Signal invalide reçu');
      return;
    }
    
    handleIncomingSignal(fromUserId, signal);
  }, [handleIncomingSignal, currentUserId]);

  // CORRECTION : Hook de communication avec gestion d'erreur
  const {
    onlineUserIds,
    spotlightedParticipantId,
    handRaiseQueue,
    understandingStatus,
    whiteboardControllerId,
    isTimerRunning,
    timerTimeLeft,
  } = useAblyCommunication({
    sessionId,
    currentUserId,
    initialTeacherId: initialTeacher.id,
    onSessionEnded: () => {
      console.log('🔚 [SESSION CLIENT] - Redirection après fin de session');
      router.push(currentUserRole === Role.PROFESSEUR ? '/teacher/dashboard' : '/student/dashboard');
    },
    onSignalReceived: handleSignalReceived,
    setActiveTool,
    setDocumentUrl,
    setActiveQuiz: handleStartQuiz,
    onNewQuizResponse: handleNewQuizResponse,
    onQuizEnded: handleEndQuiz,
  });

  // CORRECTION : Hook whiteboard avec gestion d'erreur
  const { sendOperation, flushOperations, isInitialized: isWhiteboardInitialized } = useAblyWhiteboardSync(
    sessionId, 
    currentUserId, 
    useCallback((ops: WhiteboardOperation[]) => {
      console.log(`📥 [SESSION CLIENT] - Réception de ${ops.length} opérations whiteboard`);
      setWhiteboardOperations(prev => [...prev, ...ops]);
    }, [setWhiteboardOperations])
  );

  // CORRECTION : Gestion du cycle de vie du composant
  useEffect(() => {
    isMountedRef.current = true;
    console.log(`🎯 [SESSION CLIENT] - Initialisation pour ${currentUserRole}: ${currentUserId}`);
    
    return () => { 
      isMountedRef.current = false;
      console.log(`🧹 [SESSION CLIENT] - Nettoyage pour ${currentUserId}`);
    };
  }, [currentUserRole, currentUserId]);

  // CORRECTION : Connexion WebRTC avec les utilisateurs en ligne
  useEffect(() => {
    if (!isMediaReady || !activeStream || !isMountedRef.current) {
      return;
    }

    console.log(`🔗 [SESSION CLIENT] - Connexion WebRTC avec ${onlineUserIds.length} utilisateurs en ligne`);
    
    onlineUserIds.forEach(userId => {
      if (userId !== currentUserId) {
        createPeer(userId, true, activeStream);
      }
    });
  }, [onlineUserIds, currentUserId, isMediaReady, activeStream, createPeer]);

  // CORRECTION : Handler de fin de session avec gestion d'état
  const handleEndSession = useCallback(async () => {
    if (currentUserRole !== Role.PROFESSEUR) {
      return;
    }

    setIsEndingSession(true);
    console.log('🔚 [SESSION CLIENT] - Début de la fin de session');
    
    try { 
      await endCoursSession(sessionId);
      console.log('✅ [SESSION CLIENT] - Session terminée avec succès');
    } catch (error) {
      console.error('❌ [SESSION CLIENT] - Erreur lors de la fin de session:', error);
      
      if (isMountedRef.current) {
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
    console.log('🚪 [SESSION CLIENT] - Utilisateur quitte la session');
    router.push(currentUserRole === Role.PROFESSEUR ? '/teacher/dashboard' : '/student/dashboard');
  }, [router, currentUserRole]);
  
  // CORRECTION : Handler lever/main avec gestion d'erreur
  const handleToggleHandRaise = useCallback(async (isRaised: boolean) => {
    try {
      console.log(`✋ [SESSION CLIENT] - ${isRaised ? 'Lever' : 'Baisser'} la main`);
      await updateStudentSessionStatus(sessionId, { isHandRaised: isRaised });
    } catch (error) {
      console.error('❌ [SESSION CLIENT] - Erreur lors du changement de statut main:', error);
    }
  }, [sessionId]);

  // CORRECTION : Handler reconnaissance de main avec validation
  const handleAcknowledgeNextHand = useCallback(async () => {
    if (handRaiseQueue.length === 0) {
      console.warn('⚠️ [SESSION CLIENT] - Aucune main à reconnaître');
      return;
    }

    const nextUserId = handRaiseQueue[0];
    console.log(`✅ [SESSION CLIENT] - Reconnaissance de la main de ${nextUserId}`);
    
    try {
      await ablyTrigger(getSessionChannelName(sessionId), AblyEvents.HAND_ACKNOWLEDGED, { 
        userId: nextUserId 
      });
    } catch (error) {
      console.error('❌ [SESSION CLIENT] - Erreur lors de la reconnaissance de main:', error);
    }
  }, [sessionId, handRaiseQueue]);

  // CORRECTION : Handler compréhension avec validation
  const handleUnderstandingChange = useCallback(async (status: ComprehensionLevel) => {
    if (!Object.values(ComprehensionLevel).includes(status)) {
      console.warn('⚠️ [SESSION CLIENT] - Statut de compréhension invalide:', status);
      return;
    }

    console.log(`🧠 [SESSION CLIENT] - Changement de compréhension: ${status}`);
    
    try {
      await updateStudentSessionStatus(sessionId, { understanding: status });
    } catch (error) {
      console.error('❌ [SESSION CLIENT] - Erreur lors du changement de compréhension:', error);
    }
  }, [sessionId]);

  // CORRECTION : Handler changement d'outil
  const onToolChange = useCallback(async (tool: string) => {
    console.log(`🛠️ [SESSION CLIENT] - Changement d'outil: ${tool}`);
    
    try {
      await broadcastActiveTool(sessionId, tool);
    } catch (error) {
      console.error('❌ [SESSION CLIENT] - Erreur lors du changement d\'outil:', error);
    }
  }, [sessionId]);
  
  // CORRECTION : Handler contrôleur whiteboard avec validation des droits
  const handleWhiteboardControllerChange = useCallback(async (userId: string) => {
    if (currentUserRole !== Role.PROFESSEUR) {
      console.warn('⚠️ [SESSION CLIENT] - Seul le professeur peut changer le contrôleur');
      return;
    }

    const newControllerId = userId === whiteboardControllerId ? initialTeacher?.id || null : userId;
    console.log(`🎮 [SESSION CLIENT] - Changement contrôleur whiteboard: ${newControllerId}`);
    
    try {
      await fetch(`/api/session/${sessionId}/whiteboard-controller`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ controllerId: newControllerId }) 
      });
    } catch (error) {
      console.error('❌ [SESSION CLIENT] - Erreur lors du changement de contrôleur:', error);
      
      if (isMountedRef.current) {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: 'Impossible de changer le contrôleur du tableau blanc'
        });
      }
    }
  }, [sessionId, currentUserRole, whiteboardControllerId, initialTeacher?.id, toast]);

  // CORRECTION : Handler upload document avec gestion d'état
  const handleOnUploadSuccess = useCallback(async (uploadedDoc: { name: string; url: string }) => {
    console.log(`📄 [SESSION CLIENT] - Upload réussi: ${uploadedDoc.name}`);
    
    try {
      const result = await saveAndShareDocument(sessionId, uploadedDoc);
      
      if (result.success && isMountedRef.current) {
        handleUploadSuccess(result.document);
        toast({
          title: 'Succès',
          description: 'Document partagé avec la classe'
        });
      }
    } catch (error) {
      console.error('❌ [SESSION CLIENT] - Erreur lors de l\'upload:', error);
      
      if (isMountedRef.current) {
        toast({ 
          variant: 'destructive', 
          title: 'Erreur',
          description: 'Impossible de partager le document' 
        });
      }
    }
  }, [sessionId, toast, handleUploadSuccess]);
  
  // CORRECTION : Handler démarrage quiz avec validation
  const handleOnStartQuiz = useCallback(async (quizData: CreateQuizData) => {
    console.log('❓ [SESSION CLIENT] - Démarrage du quiz');
    
    const result = await startQuiz(sessionId, quizData);
    if (!result.success && isMountedRef.current) {
      toast({ 
        variant: 'destructive', 
        title: 'Erreur', 
        description: result.error || 'Impossible de lancer le quiz.' 
      });
    }
    return result;
  }, [sessionId, toast]);

  // CORRECTION : Handler réponse quiz
  const handleSubmitQuizResponse = useCallback(async (response: QuizResponse) => {
    console.log(`📝 [SESSION CLIENT] - Soumission réponse quiz`);
    
    const result = await submitQuizResponse(sessionId, response);
    if (!result.success && isMountedRef.current) {
      toast({ 
        variant: 'destructive', 
        title: 'Erreur', 
        description: 'Impossible d\'envoyer vos réponses.' 
      });
    }
    return result;
  }, [sessionId, toast]);

  // CORRECTION : Handler fin quiz
  const handleOnEndQuiz = useCallback(async (quizId: string, responses: Map<string, QuizResponse>) => {
    console.log(`🏁 [SESSION CLIENT] - Fin du quiz: ${quizId}`);
    
    const result = await endQuiz(sessionId, quizId, responses);
    return result;
  }, [sessionId]);

  // CORRECTION : Mémoization des données dérivées
  const allSessionUsers = useMemo(() => 
    [initialTeacher, ...initialStudents].filter(Boolean) as User[], 
    [initialTeacher, initialStudents]
  );

  const spotlightedUser = useMemo(() => 
    allSessionUsers.find(u => u.id === spotlightedParticipantId),
    [allSessionUsers, spotlightedParticipantId]
  );

  const spotlightedStream = useMemo(() => 
    spotlightedParticipantId === currentUserId 
      ? activeStream 
      : remoteStreams.get(spotlightedParticipantId || '') || null,
    [spotlightedParticipantId, currentUserId, activeStream, remoteStreams]
  );

  const remoteParticipants = useMemo(() => 
    Array.from(remoteStreams.entries()).map(([id, stream]) => ({ id, stream })),
    [remoteStreams]
  );

  const isHandRaised = useMemo(() => 
    handRaiseQueue.includes(currentUserId),
    [handRaiseQueue, currentUserId]
  );

  const raisedHandUsers = useMemo(() => 
    handRaiseQueue.map(userId => allSessionUsers.find(u => u.id === userId)).filter(Boolean) as User[],
    [handRaiseQueue, allSessionUsers]
  );

  // CORRECTION : État de chargement amélioré
  if (isMediaLoading) {
    return <SessionLoading />;
  }

  console.log(`🎯 [SESSION CLIENT] - Rendu pour ${currentUserRole}, whiteboard initialisé: ${isWhiteboardInitialized}`);

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
            onSubmitQuizResponse={handleSubmitQuizResponse}
            quizResults={quizResults}
          />
        )}
      </main>
    </div>
  );
}
