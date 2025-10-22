// src/components/SessionClient.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { pusherClient } from '@/lib/pusher/client';
import type { User } from '@/lib/types';
import SimplePeer, { Instance as PeerInstance, SignalData } from 'simple-peer';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Header } from './Header';
import { ParticipantGrid } from './ParticipantGrid';
import { TeacherSessionControls } from './TeacherSessionControls';
import { StudentSessionControls } from './StudentSessionControls';
import SessionLoading from './SessionLoading';
import { endCoursSession } from '@/lib/actions';
import { VideoPlayer } from './VideoPlayer';
import { PresenceChannel } from 'pusher-js';

interface SessionClientProps {
  sessionId: string;
  initialStudents: User[];
  initialTeacher: User;
  currentUserRole: 'PROFESSEUR' | 'ELEVE';
  currentUserId: string;
}

interface PeerData {
  peer: PeerInstance;
  userId: string;
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

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<PeerData[]>([]);
  const peersRef = useRef<PeerData[]>([]);
  const userVideoRef = useRef<HTMLVideoElement>(null);
  const [sessionParticipants, setSessionParticipants] = useState<User[]>([initialTeacher, ...initialStudents]);

  const channelName = `presence-session-${sessionId}`;

  // 1. Initialize Media Stream
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        setLocalStream(stream);
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = stream;
        }
      })
      .catch(error => {
        console.error('Failed to get local stream', error);
        toast({
          variant: 'destructive',
          title: 'Erreur Média',
          description: "Impossible d'accéder à votre caméra et microphone.",
        });
      });
  }, [toast]);

  const handleEndSession = useCallback(async () => {
    // Le professeur termine la session pour tout le monde
    if (currentUserRole === 'PROFESSEUR') {
      await endCoursSession(sessionId);
    }
    // L'élève quitte simplement, la redirection est gérée par l'événement pusher ou le rechargement de page
    router.push(currentUserRole === 'PROFESSEUR' ? '/teacher/dashboard' : '/student/dashboard');
  }, [sessionId, currentUserRole, router]);


  // 2. Setup Pusher and WebRTC
  useEffect(() => {
    if (!localStream) return;

    const channel = pusherClient.subscribe(channelName) as PresenceChannel;
    console.log(`Subscribed to ${channelName}`);

    channel.bind('pusher:subscription_succeeded', () => {
      console.log('Subscription succeeded. Members:', channel.members);
       // The current user is already in channel.members.me
      const allMemberIds = Object.keys(channel.members.members);
      allMemberIds.forEach(memberId => {
        if (memberId !== currentUserId) {
          console.log(`Found existing member ${memberId}, creating peer`);
          const peer = createPeer(memberId, currentUserId, localStream);
          const peerData = { userId: memberId, peer };
          setPeers(prev => [...prev, peerData]);
          peersRef.current.push(peerData);
        }
      });
    });

    channel.bind('pusher:member_added', (member: { id: string }) => {
      console.log(`${member.id} joined the session`);
      const peer = addPeer(member.id, currentUserId, localStream);
      const peerData = { userId: member.id, peer };
      setPeers(prev => [...prev, peerData]);
      peersRef.current.push(peerData);
      toast({ title: 'Nouveau participant', description: 'Un utilisateur a rejoint la session.' });
    });

    channel.bind('pusher:member_removed', (member: { id: string }) => {
      console.log(`${member.id} left the session`);
      const peerData = peersRef.current.find(p => p.userId === member.id);
      if (peerData) {
        peerData.peer.destroy();
      }
      const newPeers = peersRef.current.filter(p => p.userId !== member.id);
      peersRef.current = newPeers;
      setPeers(newPeers);
       toast({ title: 'Participant parti', description: 'Un utilisateur a quitté la session.' });
    });

    channel.bind('signal', ({ userId, signal }: { userId: string, signal: SignalData }) => {
      const peerData = peersRef.current.find(p => p.userId === userId);
      if (peerData) {
        peerData.peer.signal(signal);
      }
    });

    // Listen for the session-ended event
    channel.bind('session-ended', () => {
      toast({
        title: "Session terminée",
        description: "Le professeur a mis fin à la session."
      });
      // Redirect all users
      handleEndSession();
    });

    return () => {
      console.log(`Unsubscribing from ${channelName}`);
      localStream.getTracks().forEach(track => track.stop());
      peersRef.current.forEach(p => p.peer.destroy());
      pusherClient.unbind('session-ended');
      pusherClient.unsubscribe(channelName);
    };
  }, [localStream, sessionId, currentUserId, toast, channelName, handleEndSession]);

  const createPeer = (userToSignal: string, callerId: string, stream: MediaStream): PeerInstance => {
    console.log(`Creating peer for ${userToSignal} from ${callerId}`);
    const peer = new SimplePeer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on('signal', signal => {
       fetch('/api/pusher/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ socket_id: userToSignal, signal, userId: callerId, channelName }),
      });
    });

    return peer;
  };

  const addPeer = (incomingSignalId: string, callerId: string, stream: MediaStream): PeerInstance => {
    console.log(`Adding peer for incoming signal from ${incomingSignalId}`);
    const peer = new SimplePeer({
      initiator: false,
      trickle: false,
      stream,
    });

    peer.on('signal', signal => {
       fetch('/api/pusher/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ socket_id: incomingSignalId, signal, userId: callerId, channelName }),
      });
    });

    return peer;
  };

  if (!localStream) {
    return <SessionLoading />;
  }
  
  const currentUser = currentUserRole === "PROFESSEUR" ? initialTeacher : initialStudents.find(s=>s.id === currentUserId);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
       <Header user={currentUser as any} />

      <div className="flex-1 flex flex-col md:flex-row p-4 gap-4 overflow-hidden">
        {/* Main Video Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-min">
          <div className="relative rounded-lg overflow-hidden border bg-muted">
            <video ref={userVideoRef} muted autoPlay playsInline className="h-full w-full object-cover" />
            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
              {currentUser?.name} (Vous)
            </div>
          </div>
          {peers.map(peerData => (
            <VideoPlayer key={peerData.userId} peer={peerData.peer} userId={peerData.userId} allUsers={[initialTeacher, ...initialStudents]} />
          ))}
        </div>

        {/* Sidebar */}
        <div className="w-full md:w-80 flex flex-col gap-4">
          {currentUserRole === 'PROFESSEUR' ? (
            <TeacherSessionControls
              onScreenShare={() => {}} // Placeholder
              isScreenSharing={false}
              raisedHands={[]}
              onLowerHand={() => {}}
              onEndSession={handleEndSession} // Pass the function here
            />
          ) : (
            <StudentSessionControls
              onRaiseHand={() => {}} // Placeholder
              isHandRaised={false}
              onComprehensionUpdate={() => {}}
              onLeaveSession={handleEndSession} // Student leaves session
            />
          )}
        </div>
      </div>
    </div>
  );
}
```