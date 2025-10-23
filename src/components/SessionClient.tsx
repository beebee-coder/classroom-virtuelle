// src/components/SessionClient.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Instance as PeerInstance } from 'simple-peer';
import * as SimplePeer from 'simple-peer';

import { pusherClient } from '@/lib/pusher/client';
import { useToast } from '@/hooks/use-toast';
import { User, Role, SessionParticipant } from '@/lib/types';
import SessionLoading from './SessionLoading';
import { TeacherSessionView } from './session/TeacherSessionView';
import { StudentSessionView } from './session/StudentSessionView';
import { SessionHeader } from './session/SessionHeader';
import { PermissionPrompt } from './PermissionPrompt';
import { endCoursSession, broadcastTimerEvent } from '@/lib/actions';
import { DummySession, getAuthSession } from '@/lib/session';

// Définition de types locaux
type UnderstandingStatus = 'understood' | 'confused' | 'lost' | 'none';
type PeerData = { id: string; peer: PeerInstance };
type SignalData = { userId: string; signal: any };

interface SessionClientProps {
  sessionId: string;
  initialStudents: User[];
  initialTeacher: User;
  currentUserRole: Role;
  currentUserId: string;
}

const INITIAL_TIMER_DURATION = 3600; // 1 heure en secondes

export default function SessionClient({
  sessionId,
  initialStudents,
  initialTeacher,
  currentUserRole,
  currentUserId,
}: SessionClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  // États principaux
  const [loading, setLoading] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<PeerData[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [spotlightedParticipantId, setSpotlightedParticipantId] = useState<string | null>(initialTeacher?.id || null);
  
  // États d'interaction
  const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set());
  const [understandingStatus, setUnderstandingStatus] = useState<Map<string, UnderstandingStatus>>(new Map());
  const [isEndingSession, setIsEndingSession] = useState(false);

  // Nouveaux états pour le minuteur
  const [timerDuration, setTimerDuration] = useState(INITIAL_TIMER_DURATION);
  const [timerTimeLeft, setTimerTimeLeft] = useState(timerDuration);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const allSessionUsers: SessionParticipant[] = [initialTeacher, ...initialStudents];
  const peersRef = useRef<PeerData[]>([]);
  const screenPeerRef = useRef<PeerInstance | null>(null);
  const channelRef = useRef<PeerInstance | null>(null);

  // ---=== 1. GESTION DES FLUX MÉDIAS ===---
  useEffect(() => {
    const getMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
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

    return () => {
      localStream?.getTracks().forEach(track => track.stop());
      screenStream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const toggleScreenShare = async () => {
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
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setScreenStream(stream);
        toast({ title: 'Partage d\'écran activé' });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Erreur de partage',
          description: 'Impossible de démarrer le partage d\'écran.'
        });
      }
    }
  };

  const signalViaAPI = async (payload: any) => {
    await fetch('/api/pusher/signal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
  }

  // ---=== 2. GESTION DES CONNEXIONS PEER-TO-PEER ===---
  const createPeer = (targetUserId: string, initiator: boolean, stream: MediaStream): PeerInstance => {
    console.log(`🤝 [PEER] - Création d'un peer pour ${targetUserId}. Initiateur: ${initiator}`);
    const peer = new SimplePeer.default({
      initiator,
      trickle: false,
      stream,
    });

    peer.on('signal', signal => {
      console.log(`📤 [PEER] - Envoi du signal de ${currentUserId} vers ${targetUserId}`);
      signalViaAPI({
        channelName: `presence-session-${sessionId}`,
        userId: currentUserId,
        target: targetUserId,
        signal,
        isReturnSignal: !initiator, // Marquer comme signal de retour si nous ne sommes pas l'initiateur
      });
    });

    return peer;
  };

  const addPeer = (incomingSignal: any, callerId: string, stream: MediaStream): PeerInstance => {
    console.log(`📥 [PEER] - Ajout d'un peer pour répondre à ${callerId}`);
    const peer = new SimplePeer.default({
      initiator: false,
      trickle: false,
      stream,
    });
    
    peer.on('signal', signal => {
      console.log(`✅ [PEER] - Envoi du signal de retour de ${currentUserId} à ${callerId}`);
      signalViaAPI({
        channelName: `presence-session-${sessionId}`,
        userId: currentUserId,
        target: callerId,
        signal,
        isReturnSignal: true, // Ceci est un signal de retour
      });
    });
    
    peer.signal(incomingSignal);
    return peer;
  };

   // ---=== GESTION DU MINUTEUR ===---
    const handleStartTimer = () => broadcastTimerEvent(sessionId, 'timer-started');
    const handlePauseTimer = () => broadcastTimerEvent(sessionId, 'timer-paused');
    const handleResetTimer = () => broadcastTimerEvent(sessionId, 'timer-reset', { duration: timerDuration });

    useEffect(() => {
        if (isTimerRunning && timerTimeLeft > 0) {
            timerIntervalRef.current = setInterval(() => {
                setTimerTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (!isTimerRunning || timerTimeLeft === 0) {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
        }

        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
        };
    }, [isTimerRunning, timerTimeLeft]);
  
  // ---=== 3. GESTION DES ÉVÉNEMENTS PUSHER ===---
  useEffect(() => {
    if (!localStream) return;

    const channelName = `presence-session-${sessionId}`;
    const channel = pusherClient.subscribe(channelName) as any;
    channelRef.current = channel;
    
    // Initialisation quand on rejoint
    channel.bind('pusher:subscription_succeeded', (members: any) => {
      const otherUsers = Object.keys(members.members).filter(id => id !== currentUserId);
      setOnlineUserIds(Object.keys(members.members));
      console.log(`✅ [PUSHER] - Abonnement réussi à la session ${sessionId}. Participants:`, otherUsers);
      
      const newPeers: PeerData[] = otherUsers.map(userId => {
        const peer = createPeer(userId, true, localStream);
        return { id: userId, peer };
      });
      setPeers(newPeers);
      peersRef.current = newPeers;
    });

    // Quand un nouvel utilisateur rejoint
    channel.bind('pusher:member_added', (member: any) => {
      if (member.id === currentUserId) return;
      console.log(`➕ [PUSHER] - Nouveau participant rejoint: ${member.id}`);
      setOnlineUserIds(prev => [...prev, member.id]);
      
      // On ne crée PAS de nouveau peer ici, on attend son signal "d'offre".
      // C'est lui l'initiateur pour les connexions avec les membres existants.
    });

    // Signal WebRTC initial ou de retour
    channel.bind('signal', (data: SignalData & { target: string, isReturnSignal?: boolean }) => {
      if (data.target !== currentUserId) return;
      console.log(`📡 [PUSHER] - Signal reçu de ${data.userId}. isReturnSignal: ${!!data.isReturnSignal}`);
      
      const peerData = peersRef.current.find(p => p.id === data.userId);

      if (data.isReturnSignal) {
        if (peerData) {
            console.log(`   -> Signal de retour. Application au peer existant.`);
            peerData.peer.signal(data.signal);
        } else {
             console.warn(`   -> Signal de retour reçu mais aucun peer initiateur trouvé pour ${data.userId}.`);
        }
      } else {
         if (peerData) {
            console.log(`   -> Signal d'offre reçu, mais un peer existe déjà. Application du signal.`);
            peerData.peer.signal(data.signal);
        } else {
            console.log(`   -> Signal d'offre reçu. Création d'un nouveau peer de réponse.`);
            const peer = addPeer(data.signal, data.userId, localStream);
            const newPeerData = { id: data.userId, peer };
            setPeers(prev => [...prev.filter(p => p.id !== data.userId), newPeerData]);
            peersRef.current = [...peersRef.current.filter(p => p.id !== data.userId), newPeerData];
        }
      }
    });

    // Quand un utilisateur quitte
    channel.bind('pusher:member_removed', (member: any) => {
      console.log(`➖ [PUSHER] - Participant parti: ${member.id}`);
      setOnlineUserIds(prev => prev.filter(id => id !== member.id));
      const peerToRemove = peersRef.current.find(p => p.id === member.id);
      peerToRemove?.peer.destroy();
      setPeers(prev => prev.filter(p => p.id !== member.id));
      peersRef.current = peersRef.current.filter(p => p.id !== member.id);
    });

    // Fin de session
    channel.bind('session-ended', () => {
      console.log('🔚 [PUSHER] - Événement de fin de session reçu.');
      toast({ title: 'Session terminée', description: 'Le professeur a mis fin à la session.' });
      router.push(currentUserRole === 'PROFESSEUR' ? '/teacher/dashboard' : '/student/dashboard');
    });

    // Mise en vedette
    channel.bind('participant-spotlighted', (data: { participantId: string }) => {
       console.log(`🌟 [PUSHER] - Mise en vedette de ${data.participantId}`);
      setSpotlightedParticipantId(data.participantId);
    });

    // Main levée
    channel.bind('hand-raise-update', (data: { userId: string; isRaised: boolean }) => {
      console.log(`✋ [PUSHER] - Main ${data.isRaised ? 'levée' : 'baissée'} par ${data.userId}`);
      setRaisedHands(prev => {
        const newSet = new Set(prev);
        data.isRaised ? newSet.add(data.userId) : newSet.delete(data.userId);
        return newSet;
      });
    });

    // Statut de compréhension
    channel.bind('understanding-update', (data: { userId: string; status: UnderstandingStatus }) => {
      console.log(`🤔 [PUSHER] - Statut de compréhension de ${data.userId} : ${data.status}`);
      setUnderstandingStatus(prev => new Map(prev).set(data.userId, data.status));
    });

    // Événements du minuteur
    channel.bind('timer-started', () => setIsTimerRunning(true));
    channel.bind('timer-paused', () => setIsTimerRunning(false));
    channel.bind('timer-reset', (data: { duration: number }) => {
        setIsTimerRunning(false);
        setTimerTimeLeft(data.duration);
        setTimerDuration(data.duration);
    });
    channel.bind('timer-update', (data: { timeLeft: number; isRunning: boolean }) => {
        setTimerTimeLeft(data.timeLeft);
        setIsTimerRunning(data.isRunning);
    });


    return () => {
      console.log(`🔌 [PUSHER] - Nettoyage des abonnements pour la session ${sessionId}`);
      channel.unbind_all();
      pusherClient.unsubscribe(channelName);
    };

  }, [sessionId, localStream, currentUserId, router, toast]);

  const onSpotlightParticipant = useCallback(async (participantId: string) => {
    if (currentUserRole !== 'PROFESSEUR') return;
    try {
      await fetch(`/api/session/${sessionId}/spotlight`, {
        method: 'POST',
        body: JSON.stringify({ participantId }),
      });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de mettre le participant en vedette.' });
    }
  }, [sessionId, currentUserRole, toast]);
  
  const handleEndSession = useCallback(async () => {
    if (currentUserRole !== 'PROFESSEUR') return;
    setIsEndingSession(true);
    try {
        const result = await endCoursSession(sessionId);
        if (result.success) {
            toast({ title: 'Session terminée', description: 'Vous allez être redirigé.' });
        } else {
            throw new Error("L'action serveur a échoué.");
        }
    } catch (error) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de terminer la session.' });
    } finally {
        setIsEndingSession(false);
    }
}, [currentUserRole, sessionId, toast, router]);


  const handleLeaveSession = useCallback(() => {
    console.log('🚪 [CLIENT] - Départ de la session demandé');
    localStream?.getTracks().forEach(track => track.stop());
    peersRef.current.forEach(({ peer }) => peer.destroy());
    
    if (channelRef.current) {
        const channelName = `presence-session-${sessionId}`;
        console.log(`🔌 [PUSHER] - Désabonnement manuel du canal ${channelName}`);
        pusherClient.unsubscribe(channelName);
        channelRef.current = null;
    }

    router.push(currentUserRole === 'PROFESSEUR' ? '/teacher/dashboard' : '/student/dashboard');
  }, [localStream, router, currentUserRole, sessionId]);

  // Logique pour déterminer le flux à afficher en vedette
  const spotlightedPeer = peers.find(p => p.id === spotlightedParticipantId);
  const spotlightedStream = spotlightedParticipantId === currentUserId 
    ? localStream 
    : spotlightedPeer?.peer.streams[0] || null;

  if (loading) {
    return <SessionLoading />;
  }

  // Formatage du temps pour l'affichage
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

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
        initialDuration={timerDuration}
        timerTimeLeft={timerTimeLeft}
        isTimerRunning={isTimerRunning}
        onStartTimer={handleStartTimer}
        onPauseTimer={handlePauseTimer}
        onResetTimer={handleResetTimer}
      />
      <main className="flex-1 flex flex-col container mx-auto px-4 sm:px-6 lg:px-8 min-h-0">
        <PermissionPrompt />
        {currentUserRole === 'PROFESSEUR' ? (
          <TeacherSessionView
            sessionId={sessionId}
            localStream={localStream}
            screenStream={screenStream}
            remoteParticipants={peers.map(p => ({ id: p.id, stream: p.peer.streams[0] }))}
            spotlightedUser={allSessionUsers.find(u => u.id === spotlightedParticipantId)}
            allSessionUsers={allSessionUsers}
            onlineUserIds={onlineUserIds}
            onSpotlightParticipant={onSpotlightParticipant}
            raisedHands={raisedHands}
            understandingStatus={understandingStatus}
            currentUserId={currentUserId}
            timerValue={formatTime(timerTimeLeft)}
            onStartTimer={handleStartTimer}
            onPauseTimer={handlePauseTimer}
            onResetTimer={handleResetTimer}
            onEndSession={handleEndSession}
            onScreenShare={toggleScreenShare}
            isScreenSharing={!!screenStream}
          />
        ) : (
          <StudentSessionView
            sessionId={sessionId}
            localStream={localStream}
            spotlightedStream={spotlightedStream}
            spotlightedUser={allSessionUsers.find(u => u.id === spotlightedParticipantId)}
            isHandRaised={raisedHands.has(currentUserId)}
            onToggleHandRaise={() => { /* Implémenter la logique d'émission */ }}
            onUnderstandingChange={(status) => { /* Implémenter la logique d'émission */ }}
            onLeaveSession={handleLeaveSession}
            currentUnderstanding={understandingStatus.get(currentUserId) || 'none'}
            currentUserId={currentUserId}
          />
        )}
      </main>
    </div>
  );
}
