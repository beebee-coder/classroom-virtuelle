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
  
  // CORRECTION : Gestion des médias avec validation
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
  
  // CORRECTION : Connexion WebRTC avec gestion d'erreur
  const {
    remoteStreams,
    createPeer,
    handleIncomingSignal
  } = useWebRTCConnection(sessionId, currentUserId, activeStream, isMountedRef.current);
  
  // CORRECTION : Gestion d'état de session avec validation
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

  // CORRECTION : Handler de signal avec validation améliorée
  const handleSignalReceived = useCallback((fromUserId: string, signal: any) => {
    if (!isMountedRef.current) return;
    
    console.log(`🔧 [SIGNAL HANDLER] - Traitement du signal de ${fromUserId} vers ${currentUserId}`);
    
    // CORRECTION : Validation robuste du signal
    if (!signal || typeof signal !== 'object' || !signal.type) {
      console.warn('⚠️ [SIGNAL HANDLER] - Signal invalide reçu:', signal);
      return;
    }
    
    // CORRECTION : Validation des types de signal WebRTC
    const validSignalTypes = ['offer', 'answer', 'candidate'];
    if (!validSignalTypes.includes(signal.type)) {
      console.warn('⚠️ [SIGNAL HANDLER] - Type de signal invalide:', signal.type);
      return;
    }
    
    try {
      handleIncomingSignal(fromUserId, signal);
    } catch (error) {
      console.error('❌ [SIGNAL HANDLER] - Erreur lors du traitement du signal:', error);
    }
  }, [handleIncomingSignal, currentUserId]);

  // CORRECTION : Hook de communication avec gestion d'erreur améliorée
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
      if (!isMountedRef.current) return;
      
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

  // CORRECTION : Connexion WebRTC avec les utilisateurs en ligne - Optimisée
  useEffect(() => {
    if (!isMediaReady || !activeStream || !isMountedRef.current || onlineUserIds.length === 0) {
      return;
    }

    console.log(`🔗 [SESSION CLIENT] - Connexion WebRTC avec ${onlineUserIds.length} utilisateurs en ligne`);
    
    // CORRECTION : Filtrer les utilisateurs déjà connectés
    const usersToConnect = onlineUserIds.filter(userId => 
      userId !== currentUserId && 
      !remoteStreams.has(userId)
    );
    
    console.log(`🔗 [SESSION CLIENT] - Nouveaux utilisateurs à connecter: ${usersToConnect.length}`);
    
    usersToConnect.forEach(userId => {
      createPeer(userId, true, activeStream);
    });
  }, [onlineUserIds, currentUserId, isMediaReady, activeStream, createPeer, remoteStreams]);

  // CORRECTION : Handler de fin de session avec gestion d'état améliorée
  const handleEndSession = useCallback(async () => {
    if (currentUserRole !== Role.PROFESSEUR) {
      console.warn('⚠️ [SESSION CLIENT] - Tentative de fin de session par non-professeur');
      return;
    }

    if (isEndingSession) {
      console.log('⏳ [SESSION CLIENT] - Fin de session déjà en cours');
      return;
    }

    setIsEndingSession(true);
    console.log('🔚 [SESSION CLIENT] - Début de la fin de session');
    
    try { 
      const result = await endCoursSession(sessionId);
      
      if (!result.success) {
        throw new Error('Erreur inconnue lors de la fin de session');
      }

      console.log('✅ [SESSION CLIENT] - Session terminée avec succès');
      
      if (isMountedRef.current) {
        toast({
          title: 'Session terminée',
          description: 'La session a été terminée avec succès'
        });
      }

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
  }, [currentUserRole, sessionId, toast, isEndingSession]);

  const handleLeaveSession = useCallback(() => {
    console.log('🚪 [SESSION CLIENT] - Utilisateur quitte la session');
    router.push(currentUserRole === Role.PROFESSEUR ? '/teacher/dashboard' : '/student/dashboard');
  }, [router, currentUserRole]);
  
  // CORRECTION : Handler lever/main avec gestion d'erreur améliorée
  const handleToggleHandRaise = useCallback(async (isRaised: boolean) => {
    if (!isMountedRef.current) return;
    
    try {
      console.log(`✋ [SESSION CLIENT] - ${isRaised ? 'Lever' : 'Baisser'} la main`);
      await updateStudentSessionStatus(sessionId, { isHandRaised: isRaised });
    } catch (error) {
      console.error('❌ [SESSION CLIENT] - Erreur lors du changement de statut main:', error);
      
      if (isMountedRef.current) {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: 'Impossible de changer le statut de la main'
        });
      }
    }
  }, [sessionId, toast]);

  // CORRECTION : Handler reconnaissance de main avec validation améliorée
  const handleAcknowledgeNextHand = useCallback(async () => {
    if (handRaiseQueue.length === 0) {
      console.warn('⚠️ [SESSION CLIENT] - Aucune main à reconnaître');
      
      if (isMountedRef.current) {
        toast({
          variant: 'destructive',
          title: 'Aucune main levée',
          description: 'Aucun étudiant n\'a levé la main'
        });
      }
      return;
    }

    const nextUserId = handRaiseQueue[0];
    console.log(`✅ [SESSION CLIENT] - Reconnaissance de la main de ${nextUserId}`);
    
    try {
      await ablyTrigger(getSessionChannelName(sessionId), AblyEvents.HAND_ACKNOWLEDGED, { 
        userId: nextUserId,
        timestamp: Date.now()
      });
      
      if (isMountedRef.current) {
        toast({
          title: 'Main reconnue',
          description: `Main de l'étudiant reconnue`
        });
      }
    } catch (error) {
      console.error('❌ [SESSION CLIENT] - Erreur lors de la reconnaissance de main:', error);
      
      if (isMountedRef.current) {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: 'Impossible de reconnaître la main'
        });
      }
    }
  }, [sessionId, handRaiseQueue, toast]);

  // CORRECTION : Handler compréhension avec validation améliorée
  const handleUnderstandingChange = useCallback(async (status: ComprehensionLevel) => {
    if (!isMountedRef.current) return;
    
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

  // CORRECTION : Handler changement d'outil avec validation
  const onToolChange = useCallback(async (tool: string) => {
    if (!isMountedRef.current) return;
    
    console.log(`🛠️ [SESSION CLIENT] - Changement d'outil: ${tool}`);
    
    try {
      await broadcastActiveTool(sessionId, tool);
    } catch (error) {
      console.error('❌ [SESSION CLIENT] - Erreur lors du changement d\'outil:', error);
    }
  }, [sessionId]);
  
  // CORRECTION : Handler contrôleur whiteboard avec validation des droits améliorée
  const handleWhiteboardControllerChange = useCallback(async (userId: string) => {
    if (currentUserRole !== Role.PROFESSEUR) {
      console.warn('⚠️ [SESSION CLIENT] - Seul le professeur peut changer le contrôleur');
      
      if (isMountedRef.current) {
        toast({
          variant: 'destructive',
          title: 'Permission refusée',
          description: 'Seul le professeur peut changer le contrôleur du tableau blanc'
        });
      }
      return;
    }

    const newControllerId = userId === whiteboardControllerId ? initialTeacher?.id || null : userId;
    console.log(`🎮 [SESSION CLIENT] - Changement contrôleur whiteboard: ${newControllerId}`);
    
    try {
      const response = await fetch(`/api/session/${sessionId}/whiteboard-controller`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ controllerId: newControllerId }) 
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      console.log('✅ [SESSION CLIENT] - Contrôleur whiteboard changé avec succès');
      
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

  // CORRECTION : Handler upload document avec gestion d'état améliorée
  const handleOnUploadSuccess = useCallback(async (uploadedDoc: { name: string; url: string }) => {
    if (!isMountedRef.current) return;
    
    console.log(`📄 [SESSION CLIENT] - Upload réussi: ${uploadedDoc.name}`);
    
    try {
      const result = await saveAndShareDocument(sessionId, uploadedDoc);
      
      if (!result.success) {
        throw new Error('Erreur inconnue lors de l\'upload');
      }

      if (isMountedRef.current) {
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
  
  // CORRECTION : Handler démarrage quiz avec validation améliorée
  const handleOnStartQuiz = useCallback(async (quizData: CreateQuizData) => {
    if (!isMountedRef.current) {
      return { success: false, error: 'Composant non monté' };
    }
    
    console.log('❓ [SESSION CLIENT] - Démarrage du quiz');
    
    try {
      const result = await startQuiz(sessionId, quizData);
      
      if (!result.success && isMountedRef.current) {
        toast({ 
          variant: 'destructive', 
          title: 'Erreur', 
          description: result.error || 'Impossible de lancer le quiz.' 
        });
      }
      return result;
    } catch (error) {
      console.error('❌ [SESSION CLIENT] - Erreur lors du démarrage du quiz:', error);
      
      if (isMountedRef.current) {
        toast({ 
          variant: 'destructive', 
          title: 'Erreur', 
          description: 'Erreur inattendue lors du lancement du quiz' 
        });
      }
      return { success: false, error: 'Erreur inattendue' };
    }
  }, [sessionId, toast]);

  // CORRECTION : Handler réponse quiz avec gestion d'erreur
  const handleSubmitQuizResponse = useCallback(async (response: QuizResponse) => {
    if (!isMountedRef.current) {
      return { success: false, error: 'Composant non monté' };
    }
    
    console.log(`📝 [SESSION CLIENT] - Soumission réponse quiz`);
    
    try {
      const result = await submitQuizResponse(sessionId, response);
      
      if (!result.success && isMountedRef.current) {
        toast({ 
          variant: 'destructive', 
          title: 'Erreur', 
          description: 'Impossible d\'envoyer vos réponses.' 
        });
      }
      return result;
    } catch (error) {
      console.error('❌ [SESSION CLIENT] - Erreur lors de la soumission du quiz:', error);
      
      if (isMountedRef.current) {
        toast({ 
          variant: 'destructive', 
          title: 'Erreur', 
          description: 'Erreur inattendue lors de l\'envoi des réponses' 
        });
      }
      return { success: false, error: 'Erreur inattendue' };
    }
  }, [sessionId, toast]);

  // CORRECTION : Handler fin quiz avec gestion d'erreur
  const handleOnEndQuiz = useCallback(async (quizId: string, responses: Map<string, QuizResponse>) => {
    if (!isMountedRef.current) {
      return { success: false, error: 'Composant non monté' };
    }
    
    console.log(`🏁 [SESSION CLIENT] - Fin du quiz: ${quizId}`);
    
    try {
      const result = await endQuiz(sessionId, quizId, responses);
      return result;
    } catch (error) {
      console.error('❌ [SESSION CLIENT] - Erreur lors de la fin du quiz:', error);
      return { success: false, error: 'Erreur inattendue' };
    }
  }, [sessionId]);

  // CORRECTION CRITIQUE : Calcul du spotlightedStream optimisé
 // CORRECTION CRITIQUE : Calcul du spotlightedStream pour l'affichage des caméras
const spotlightedStream = useMemo(() => {
  console.log(`🔦 [SPOTLIGHT STREAM] - Calcul pour participant: ${spotlightedParticipantId}, currentUser: ${currentUserId}`);
  
  if (!spotlightedParticipantId) {
    console.log(`🔦 [SPOTLIGHT STREAM] - Aucun participant spotlighté`);
    return null;
  }
  
  // CORRECTION : Si c'est l'utilisateur courant, utiliser le stream local
  if (spotlightedParticipantId === currentUserId) {
    console.log(`🔦 [SPOTLIGHT STREAM] - Utilisation stream local: ${activeStream?.active ? 'actif' : 'inactif'}`);
    return activeStream;
  }
  
  // CORRECTION CRITIQUE : Recherche dans les streams distants avec validation IMMÉDIATE
  const remoteStream = remoteStreams.get(spotlightedParticipantId);
  
  if (remoteStream) {
    // CORRECTION : Validation IMMÉDIATE du stream distant sans délai
    const isStreamActive = remoteStream.active;
    const hasVideoTracks = remoteStream.getVideoTracks().length > 0;
    const hasAudioTracks = remoteStream.getAudioTracks().length > 0;
    
    console.log(`🔦 [SPOTLIGHT STREAM] - Stream distant trouvé: actif=${isStreamActive}, vidéo=${hasVideoTracks}, audio=${hasAudioTracks}`);
    
    // CORRECTION : Retourner le stream IMMÉDIATEMENT s'il est actif
    if (isStreamActive && (hasVideoTracks || hasAudioTracks)) {
      console.log(`✅ [SPOTLIGHT STREAM] - Stream valide trouvé pour ${spotlightedParticipantId}`);
      return remoteStream;
    } else {
      console.warn(`⚠️ [SPOTLIGHT STREAM] - Stream invalide pour ${spotlightedParticipantId}: actif=${isStreamActive}, vidéo=${hasVideoTracks}, audio=${hasAudioTracks}`);
    }
  } else {
    console.log(`🔦 [SPOTLIGHT STREAM] - Aucun stream distant trouvé pour ${spotlightedParticipantId}`);
  }
  
  console.log(`🔦 [SPOTLIGHT STREAM] - Aucun stream valide trouvé pour ${spotlightedParticipantId}`);
  return null;
}, [spotlightedParticipantId, currentUserId, activeStream, remoteStreams]);
  // CORRECTION : Mémoization des données dérivées optimisée
  const allSessionUsers = useMemo(() => 
    [initialTeacher, ...initialStudents].filter(Boolean) as User[], 
    [initialTeacher, initialStudents]
  );

  const spotlightedUser = useMemo(() => 
    spotlightedParticipantId ? allSessionUsers.find(u => u.id === spotlightedParticipantId) : undefined,
    [allSessionUsers, spotlightedParticipantId]
  );

  const remoteParticipants = useMemo(() => 
    Array.from(remoteStreams.entries())
      .filter(([_, stream]) => stream && stream.active)
      .map(([id, stream]) => ({ id, stream })),
    [remoteStreams]
  );

  const isHandRaised = useMemo(() => 
    handRaiseQueue.includes(currentUserId),
    [handRaiseQueue, currentUserId]
  );

  const raisedHandUsers = useMemo(() => 
    handRaiseQueue
      .map(userId => allSessionUsers.find(u => u.id === userId))
      .filter(Boolean) as User[],
    [handRaiseQueue, allSessionUsers]
  );

  // CORRECTION : État de chargement amélioré
  if (isMediaLoading) {
    return <SessionLoading />;
  }

  // CORRECTION : Logs de débogage conditionnels (uniquement en développement)
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 [DEBUG SPOTLIGHT] - spotlightedParticipantId: ${spotlightedParticipantId}`);
    console.log(`🔍 [DEBUG SPOTLIGHT] - currentUserId: ${currentUserId}`);
    console.log(`🔍 [DEBUG SPOTLIGHT] - remoteStreams keys: ${Array.from(remoteStreams.keys())}`);
    console.log(`🔍 [DEBUG SPOTLIGHT] - spotlightedStream calculé:`, spotlightedStream);
    console.log(`🔍 [DEBUG SPOTLIGHT] - spotlightedStream actif: ${spotlightedStream?.active}`);
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
