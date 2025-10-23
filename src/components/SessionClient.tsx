// src/components/SessionClient.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import type { Instance as PeerInstance } from 'simple-peer';
import SimplePeer from 'simple-peer';

import { pusherClient } from '@/lib/pusher/client';
import { useToast } from '@/hooks/use-toast';
import { User, Role } from '@/lib/types';
import SessionLoading from './SessionLoading';
import { TeacherSessionView } from './session/TeacherSessionView';
import { StudentSessionView } from './session/StudentSessionView';
import { SessionHeader } from './session/SessionHeader';
import { PermissionPrompt } from './PermissionPrompt';
import { endCoursSession } from '@/lib/actions';

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

export default function SessionClient({
  sessionId,
  initialStudents,
  initialTeacher,
  currentUserRole,
  currentUserId,
}: SessionClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();
  
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
  
  const allSessionUsers = [initialTeacher, ...initialStudents];
  const peersRef = useRef<PeerData[]>([]);
  const screenPeerRef = useRef<PeerInstance | null>(null);

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
        const stream = await navigator.mediaDevices.getDisplayMedia({ cursor: true });
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
    const peer = new SimplePeer({
      initiator,
      trickle: false,
      stream,
    });

    peer.on('signal', signal => {
      signalViaAPI({
        channelName: `presence-session-${sessionId}`,
        userId: currentUserId,
        target: targetUserId,
        signal,
      });
    });

    return peer;
  };

  const addPeer = (incomingSignal: any, callerId: string, stream: MediaStream): PeerInstance => {
    const peer = new SimplePeer({
      initiator: false,
      trickle: false,
      stream,
    });
    
    peer.on('signal', signal => {
      signalViaAPI({
        channelName: `presence-session-${sessionId}`,
        userId: currentUserId,
        target: callerId,
        signal,
        isReturnSignal: true, // Indicate this is a return signal
      });
    });
    
    peer.signal(incomingSignal);
    return peer;
  };
  
  // ---=== 3. GESTION DES ÉVÉNEMENTS PUSHER ===---
  useEffect(() => {
    if (!localStream) return;

    const channelName = `presence-session-${sessionId}`;
    const channel = pusherClient.subscribe(channelName);
    
    // Initialisation quand on rejoint
    channel.bind('pusher:subscription_succeeded', (members: any) => {
      const otherUsers = Object.keys(members.members).filter(id => id !== currentUserId);
      setOnlineUserIds(Object.keys(members.members));
      
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
      setOnlineUserIds(prev => [...prev, member.id]);
      const peer = createPeer(member.id, true, localStream);
      setPeers(prev => [...prev.filter(p => p.id !== member.id), { id: member.id, peer }]);
      peersRef.current = [...peersRef.current.filter(p => p.id !== member.id), { id: member.id, peer }];
    });

    // Signal WebRTC initial ou de retour
    channel.bind('signal', (data: SignalData & { target: string, isReturnSignal?: boolean }) => {
      if (data.target !== currentUserId) return;
      
      const peerData = peersRef.current.find(p => p.id === data.userId);

      if (data.isReturnSignal) {
        // C'est un signal de retour, on signale simplement le peer existant
        peerData?.peer.signal(data.signal);
      } else {
        // C'est un signal initial, on crée un nouveau peer pour répondre
        if (!peerData) {
            const peer = addPeer(data.signal, data.userId, localStream);
            setPeers(prev => [...prev.filter(p => p.id !== data.userId), { id: data.userId, peer }]);
            peersRef.current = [...peersRef.current.filter(p => p.id !== data.userId), { id: data.userId, peer }];
        }
      }
    });

    // Quand un utilisateur quitte
    channel.bind('pusher:member_removed', (member: any) => {
      setOnlineUserIds(prev => prev.filter(id => id !== member.id));
      const peerToRemove = peersRef.current.find(p => p.id === member.id);
      peerToRemove?.peer.destroy();
      setPeers(prev => prev.filter(p => p.id !== member.id));
      peersRef.current = peersRef.current.filter(p => p.id !== member.id);
    });

    // Fin de session
    channel.bind('session-ended', () => {
      toast({ title: 'Session terminée', description: 'Le professeur a mis fin à la session.' });
      router.push(currentUserRole === 'PROFESSEUR' ? '/teacher/dashboard' : '/student/dashboard');
    });

    // Mise en vedette
    channel.bind('participant-spotlighted', (data: { participantId: string }) => {
      setSpotlightedParticipantId(data.participantId);
    });

    // Main levée
    channel.bind('hand-raise-update', (data: { userId: string; isRaised: boolean }) => {
      setRaisedHands(prev => {
        const newSet = new Set(prev);
        data.isRaised ? newSet.add(data.userId) : newSet.delete(data.userId);
        return newSet;
      });
    });

    // Statut de compréhension
    channel.bind('understanding-update', (data: { userId: string; status: UnderstandingStatus }) => {
      setUnderstandingStatus(prev => new Map(prev).set(data.userId, data.status));
    });

    return () => {
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
            // Simulation de la redirection après un court délai pour que l'utilisateur voie le toast
            setTimeout(() => {
                router.push('/teacher/dashboard');
            }, 1500);
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
    router.push(currentUserRole === 'PROFESSEUR' ? '/teacher/dashboard' : '/student/dashboard');
  }, [localStream, router, currentUserRole]);

  // Logique pour déterminer le flux à afficher en vedette
  const spotlightedPeer = peers.find(p => p.id === spotlightedParticipantId);
  const spotlightedStream = spotlightedParticipantId === currentUserId 
    ? localStream 
    : spotlightedPeer?.peer.streams[0] || null;

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
        initialDuration={3600}
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
            currentUnderstanding={understandingStatus.get(currentUserId) || 'none'}
          />
        )}
      </main>
    </div>
  );
}
