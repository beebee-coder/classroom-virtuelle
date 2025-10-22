// src/components/SessionClient.tsx - Version fusionnée améliorée
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { pusherClient } from '@/lib/pusher/client';
import type { User as PrismaUser } from '@prisma/client';
import SimplePeer, { Instance as PeerInstance, SignalData } from 'simple-peer';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import SessionLoading from './SessionLoading';
import { endCoursSession, serverSpotlightParticipant, broadcastTimerEvent } from '@/lib/actions';
import { VideoPlayer } from './VideoPlayer';
import { PresenceChannel } from 'pusher-js';
import { 
    Video, 
    VideoOff, 
    Mic, 
    MicOff, 
    ScreenShare, 
    ScreenShareOff, 
    Hand, 
    Users, 
    MessageSquare,
    Clock,
    X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { ParticipantGrid } from './ParticipantGrid';
import { TeacherSessionControls } from './TeacherSessionControls';
import { StudentSessionControls } from './StudentSessionControls';

// Use a more generic role type to avoid conflicts
type SessionRole = 'PROFESSEUR' | 'ELEVE';

interface SessionClientProps {
  sessionId: string;
  initialStudents: PrismaUser[];
  initialTeacher: PrismaUser;
  currentUserRole: SessionRole;
  currentUserId: string;
}

interface PeerData {
  peer: PeerInstance;
  userId: string;
}

interface Participant {
  id: string;
  name: string;
  role: SessionRole;
  stream?: MediaStream;
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
  const [sessionParticipants, setSessionParticipants] = useState<Participant[]>([]);
  
  // États de l'UI
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  // États de l'élève
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [comprehension, setComprehension] = useState<'compris' | 'confus' | 'perdu'>('confus');
  
  // États du professeur
  const [raisedHands, setRaisedHands] = useState<string[]>([]);
  const [comprehensionLevels, setComprehensionLevels] = useState<Record<string, 'compris' | 'confus' | 'perdu'>>({});
  const [spotlightParticipantId, setSpotlightParticipantId] = useState<string | null>(null);
  
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const channelName = `presence-session-${sessionId}`;
  const pusherChannelRef = useRef<PresenceChannel | null>(null);

  // Initialisation du média
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = stream;
        }
        console.log('✅ [SESSION] - Médias locaux initialisés');
      } catch (error) {
        console.error('❌ [SESSION] - Erreur d\'accès aux médias:', error);
        toast({
          variant: 'destructive',
          title: 'Erreur de connexion',
          description: 'Accès à la caméra/microphone refusé',
        });
      }
    };
    initializeMedia();
  }, [toast]);

  // Fin de session
  const handleEndSession = useCallback(async () => {
    if (currentUserRole === 'PROFESSEUR') {
      await endCoursSession(sessionId);
    }
    router.push(currentUserRole === 'PROFESSEUR' ? '/teacher/dashboard' : '/student/dashboard');
  }, [sessionId, currentUserRole, router]);

  // Configuration de Pusher et WebRTC
  useEffect(() => {
    if (!localStream) return;

    const channel = pusherClient.subscribe(channelName) as PresenceChannel;
    pusherChannelRef.current = channel;
    console.log(`📡 [SESSION] - Connexion au canal: ${channelName}`);

    channel.bind('pusher:subscription_succeeded', () => {
      console.log('✅ [SESSION] - Abonnement réussi');
      const allMemberIds = Object.keys(channel.members.members);
      setSessionParticipants(allMemberIds.map(id => ({ id, name: channel.members.members[id].name || `User-${id.slice(0,4)}`, role: channel.members.members[id].role })));
      
      allMemberIds.forEach(memberId => {
        if (memberId !== currentUserId) {
          console.log(`🔗 [WEBRTC] - Connexion à ${memberId}`);
          const peer = createPeer(memberId, currentUserId, localStream);
          const peerData = { userId: memberId, peer };
          setPeers(prev => [...prev, peerData]);
          peersRef.current.push(peerData);
        }
      });
    });

    channel.bind('pusher:member_added', (member: { id: string, info: any }) => {
        console.log(`➕ [SESSION] - Participant ajouté: ${member.id}`);
        setSessionParticipants(prev => [...prev, { id: member.id, name: member.info.name, role: member.info.role }]);
        
        const peer = addPeer(member.id, currentUserId, localStream);
        const peerData = { userId: member.id, peer };
        setPeers(prev => [...prev, peerData]);
        peersRef.current.push(peerData);
        
        toast({ title: 'Nouveau participant', description: `${member.info.name} a rejoint la session.` });
    });

    channel.bind('pusher:member_removed', (member: { id: string }) => {
      console.log(`➖ [SESSION] - Participant retiré: ${member.id}`);
      setSessionParticipants(prev => prev.filter(p => p.id !== member.id));
      
      const peerData = peersRef.current.find(p => p.userId === member.id);
      if (peerData) peerData.peer.destroy();
      
      const newPeers = peersRef.current.filter(p => p.userId !== member.id);
      peersRef.current = newPeers;
      setPeers(newPeers);
      
      toast({ title: 'Participant parti', description: 'Un utilisateur a quitté la session.' });
    });

    channel.bind('signal', ({ userId, signal }: { userId: string, signal: SignalData }) => {
      const peerData = peersRef.current.find(p => p.userId === userId);
      peerData?.peer.signal(signal);
    });

    channel.bind('client-hand-raised', (data: { userId: string, raised: boolean }) => {
      setRaisedHands(prev => data.raised ? [...prev, data.userId] : prev.filter(id => id !== data.userId));
    });

    channel.bind('client-comprehension-update', (data: { userId: string, level: 'compris' | 'confus' | 'perdu' }) => {
      setComprehensionLevels(prev => ({ ...prev, [data.userId]: data.level }));
    });
    
     channel.bind('session-ended', () => {
        toast({ title: "Session terminée", description: "Le professeur a mis fin à la session." });
        handleEndSession();
    });

    return () => {
      console.log('🧹 [SESSION] - Nettoyage de la session');
      localStream.getTracks().forEach(track => track.stop());
      peersRef.current.forEach(p => p.peer.destroy());
      pusherClient.unsubscribe(channelName);
    };
  }, [localStream, sessionId, currentUserId, toast, channelName, handleEndSession]);

  const createPeer = (userToSignal: string, callerId: string, stream: MediaStream): PeerInstance => {
    const peer = new SimplePeer({ initiator: true, trickle: false, stream });
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
    const peer = new SimplePeer({ initiator: false, trickle: false, stream });
    peer.on('signal', signal => {
      fetch('/api/pusher/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ socket_id: incomingSignalId, signal, userId: callerId, channelName }),
      });
    });
    return peer;
  };

  const handleRaiseHand = () => {
    const newRaisedState = !isHandRaised;
    setIsHandRaised(newRaisedState);
    pusherChannelRef.current?.trigger('client-hand-raised', { userId: currentUserId, raised: newRaisedState });
  };
  
  const handleLowerHand = (userId: string) => {
    pusherChannelRef.current?.trigger('client-hand-raised', { userId: userId, raised: false });
  };

  const handleComprehensionUpdate = (level: 'compris' | 'confus' | 'perdu') => {
    setComprehension(level);
    pusherChannelRef.current?.trigger('client-comprehension-update', { userId: currentUserId, level: level });
  };

  const handleToggleScreenShare = async () => {
      // ... (screen sharing logic - keep as is)
  };
  
  const handleSpotlight = (participantId: string) => {
    serverSpotlightParticipant(sessionId, participantId);
  }

  // Timer logic
   const formatTime = (timeInSeconds: number) => {
        const minutes = Math.floor(timeInSeconds / 60).toString().padStart(2, '0');
        const seconds = (timeInSeconds % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
    };

    const handleStartTimer = () => {
        if (!isTimerRunning) {
            setIsTimerRunning(true);
            timerIntervalRef.current = setInterval(() => {
                setTimer(prev => prev + 1);
            }, 1000);
            broadcastTimerEvent(sessionId, 'timer-started');
        }
    };
    
    const handlePauseTimer = () => {
        if (isTimerRunning && timerIntervalRef.current) {
            setIsTimerRunning(false);
            clearInterval(timerIntervalRef.current);
            broadcastTimerEvent(sessionId, 'timer-paused');
        }
    };

    const handleResetTimer = () => {
        setIsTimerRunning(false);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        setTimer(0);
        broadcastTimerEvent(sessionId, 'timer-reset');
    };


  if (!localStream) {
    return <SessionLoading />;
  }

  const allSessionUsers = [initialTeacher, ...initialStudents];
  const mainVideoPeer = peers.find(p => p.userId === spotlightParticipantId);

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Main content */}
      <main className="flex-1 flex flex-col">
        {/* Main video area */}
        <div className="flex-1 bg-muted/40 relative flex items-center justify-center">
            {mainVideoPeer ? (
                <VideoPlayer peer={mainVideoPeer.peer} userId={mainVideoPeer.userId} allUsers={allSessionUsers} isSpotlighted={true} />
            ) : (
                 <p>Le professeur partagera bientôt son écran ou mettra quelqu'un en vedette.</p>
            )}
        </div>
        
        {/* Video strip */}
        <div className="h-40 bg-background border-t p-2">
            <div className="flex gap-2 h-full">
                {/* Local Video */}
                <div className="h-full aspect-video rounded-lg overflow-hidden relative">
                    <video ref={userVideoRef} autoPlay muted className="w-full h-full object-cover" />
                    <Badge variant="secondary" className="absolute bottom-1 left-1 text-xs">Vous</Badge>
                </div>
                {/* Peer Videos */}
                {peers.map(peerData => (
                    <div key={peerData.userId} className="h-full aspect-video rounded-lg overflow-hidden relative">
                        <VideoPlayer peer={peerData.peer} userId={peerData.userId} allUsers={allSessionUsers} />
                    </div>
                ))}
            </div>
        </div>
      </main>

      {/* Sidebar */}
      <aside className="w-80 border-l flex flex-col">
        <div className="p-4 border-b">
            <h2 className="font-semibold text-lg">Session en cours</h2>
            <p className="text-sm text-muted-foreground">{sessionId.slice(0, 15)}...</p>
        </div>

        <Tabs defaultValue="participants" className="flex-1 flex flex-col">
            <TabsList className="w-full">
                <TabsTrigger value="participants" className="flex-1">Participants</TabsTrigger>
                <TabsTrigger value="controls" className="flex-1">Contrôles</TabsTrigger>
            </TabsList>
            <TabsContent value="participants" className="flex-1 overflow-y-auto p-4">
                <ParticipantGrid 
                    participants={allSessionUsers}
                    currentUserId={currentUserId}
                    raisedHands={raisedHands}
                    comprehension={comprehensionLevels}
                    onSpotlight={currentUserRole === 'PROFESSEUR' ? handleSpotlight : undefined}
                />
            </TabsContent>
            <TabsContent value="controls" className="flex-1 overflow-y-auto p-4">
                {currentUserRole === 'PROFESSEUR' ? (
                    <TeacherSessionControls
                        onScreenShare={handleToggleScreenShare}
                        isScreenSharing={isScreenSharing}
                        raisedHands={raisedHands}
                        onLowerHand={handleLowerHand}
                        onEndSession={handleEndSession}
                        onStartTimer={handleStartTimer}
                        onPauseTimer={handlePauseTimer}
                        onResetTimer={handleResetTimer}
                        timerValue={formatTime(timer)}
                    />
                ) : (
                    <StudentSessionControls
                        onRaiseHand={handleRaiseHand}
                        isHandRaised={isHandRaised}
                        onComprehensionUpdate={handleComprehensionUpdate}
                        currentComprehension={comprehension}
                        onLeaveSession={handleEndSession}
                    />
                )}
            </TabsContent>
        </Tabs>
      </aside>
    </div>
  );
}

