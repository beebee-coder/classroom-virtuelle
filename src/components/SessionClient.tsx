// src/components/SessionClient.tsx - Version fusionnée améliorée
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { pusherClient } from '@/lib/pusher/client';
import type { User as PrismaUser } from '@prisma/client';
import type { Role } from '@/lib/types';
import SimplePeer, { Instance as PeerInstance, SignalData } from 'simple-peer';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Header } from './Header';
import { TeacherSessionControls } from './TeacherSessionControls';
import { StudentSessionControls } from './StudentSessionControls';
import SessionLoading from './SessionLoading';
import { endCoursSession } from '@/lib/actions';
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
    Crown,
    Smile,
    Meh,
    Frown,
    X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

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
  image?: string;
  isTeacher?: boolean;
  stream?: MediaStream;
  isAudioMuted?: boolean;
  isVideoMuted?: boolean;
  comprehension?: 'happy' | 'neutral' | 'confused';
  raisedHand?: boolean;
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

  // États WebRTC existants
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<PeerData[]>([]);
  const peersRef = useRef<PeerData[]>([]);
  const userVideoRef = useRef<HTMLVideoElement>(null);
  
  // Nouveaux états pour l'UI améliorée
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [raisedHand, setRaisedHand] = useState(false);
  const [comprehension, setComprehension] = useState<'happy' | 'neutral' | 'confused'>('neutral');
  const [activeTab, setActiveTab] = useState('video');
  const [spotlightedParticipant, setSpotlightedParticipant] = useState<string | null>(null);
  const [sessionParticipants, setSessionParticipants] = useState<Participant[]>([]);

  const channelName = `presence-session-${sessionId}`;
  const screenShareRef = useRef<HTMLVideoElement>(null);
  const pusherChannelRef = useRef<PresenceChannel | null>(null);

  // 1. Initialize Media Stream (version améliorée)
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        
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
          description: 'Accès aux caméra/microphone refusé',
        });
      }
    };

    initializeMedia();
  }, [toast]);

  const handleEndSession = useCallback(async () => {
    if (currentUserRole === 'PROFESSEUR') {
      await endCoursSession(sessionId);
    }
    router.push(currentUserRole === 'PROFESSEUR' ? '/teacher/dashboard' : '/student/dashboard');
  }, [sessionId, currentUserRole, router]);

  // 2. Setup Pusher and WebRTC (version améliorée)
  useEffect(() => {
    if (!localStream) return;

    const channel = pusherClient.subscribe(channelName) as PresenceChannel;
    pusherChannelRef.current = channel;
    console.log(`📡 [SESSION] - Connexion au canal: ${channelName}`);

    // Gestion de présence
    channel.bind('pusher:subscription_succeeded', () => {
      console.log('✅ [SESSION] - Abonnement réussi');
      updateParticipantsList(channel);
      
      // WebRTC: Connect to existing members
      const allMemberIds = Object.keys(channel.members.members);
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

    channel.bind('pusher:member_added', (member: { id: string }) => {
      console.log(`➕ [SESSION] - Participant ajouté: ${member.id}`);
      updateParticipantsList(channel);
      
      // WebRTC: Add new peer
      const peer = addPeer(member.id, currentUserId, localStream);
      const peerData = { userId: member.id, peer };
      setPeers(prev => [...prev, peerData]);
      peersRef.current.push(peerData);
      
      toast({ 
        title: 'Nouveau participant', 
        description: 'Un utilisateur a rejoint la session.' 
      });
    });

    channel.bind('pusher:member_removed', (member: { id: string }) => {
      console.log(`➖ [SESSION] - Participant retiré: ${member.id}`);
      updateParticipantsList(channel);
      
      // WebRTC: Remove peer
      const peerData = peersRef.current.find(p => p.userId === member.id);
      if (peerData) {
        peerData.peer.destroy();
      }
      const newPeers = peersRef.current.filter(p => p.userId !== member.id);
      peersRef.current = newPeers;
      setPeers(newPeers);
      
      toast({ 
        title: 'Participant parti', 
        description: 'Un utilisateur a quitté la session.' 
      });
    });

    // Signaux WebRTC
    channel.bind('signal', ({ userId, signal }: { userId: string, signal: SignalData }) => {
      const peerData = peersRef.current.find(p => p.userId === userId);
      if (peerData) {
        peerData.peer.signal(signal);
      }
    });

    // Événements de session améliorés
    channel.bind('participant-spotlighted', (data: any) => {
      console.log('🌟 [SESSION] - Participant mis en avant:', data);
      setSpotlightedParticipant(data.participantId);
    });

    channel.bind('session-ended', () => {
      toast({
        title: "Session terminée",
        description: "Le professeur a mis fin à la session."
      });
      handleEndSession();
    });

    channel.bind('client-hand-raised', (data: any) => {
      console.log('✋ [SESSION] - Main levée:', data);
      setSessionParticipants(prev => 
        prev.map(p => 
          p.id === data.participantId 
            ? { ...p, raisedHand: data.raised } 
            : p
        )
      );
    });

    channel.bind('client-comprehension-update', (data: any) => {
      console.log('💡 [SESSION] - Mise à jour compréhension:', data);
      setSessionParticipants(prev => 
        prev.map(p => 
          p.id === data.participantId 
            ? { ...p, comprehension: data.comprehension } 
            : p
        )
      );
    });

    return () => {
      console.log('🧹 [SESSION] - Nettoyage de la session');
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      peersRef.current.forEach(p => p.peer.destroy());
      pusherClient.unsubscribe(channelName);
    };
  }, [localStream, sessionId, currentUserId, toast, channelName, handleEndSession]);

  // Fonctions WebRTC existantes
  const createPeer = (userToSignal: string, callerId: string, stream: MediaStream): PeerInstance => {
    console.log(`🔗 [WEBRTC] - Création peer pour ${userToSignal}`);
    const peer = new SimplePeer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on('signal', signal => {
      fetch('/api/pusher/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          socket_id: userToSignal, 
          signal, 
          userId: callerId, 
          channelName 
        }),
      });
    });

    return peer;
  };

  const addPeer = (incomingSignalId: string, callerId: string, stream: MediaStream): PeerInstance => {
    console.log(`🔗 [WEBRTC] - Ajout peer pour ${incomingSignalId}`);
    const peer = new SimplePeer({
      initiator: false,
      trickle: false,
      stream,
    });

    peer.on('signal', signal => {
      fetch('/api/pusher/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          socket_id: incomingSignalId, 
          signal, 
          userId: callerId, 
          channelName 
        }),
      });
    });

    return peer;
  };

  // Fonctions UI améliorées
  const updateParticipantsList = (channel: PresenceChannel) => {
    if (channel.members?.members) {
      const members = Object.values(channel.members.members) as any[];
      const participantsList: Participant[] = members.map(member => ({
        id: member.id,
        name: member.info?.name || 'Utilisateur',
        image: member.info?.image,
        isTeacher: member.info?.role === 'PROFESSEUR',
        isAudioMuted: false,
        isVideoMuted: false,
        comprehension: 'neutral'
      }));
      
      setSessionParticipants(participantsList);
      console.log('👥 [SESSION] - Liste des participants mise à jour:', participantsList);
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoMuted(!videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true,
          audio: true 
        });
        
        if (screenShareRef.current) {
          screenShareRef.current.srcObject = screenStream;
        }
        
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
        };
        
        setIsScreenSharing(true);
      } else {
        if (screenShareRef.current?.srcObject) {
          const tracks = (screenShareRef.current.srcObject as MediaStream).getTracks();
          tracks.forEach(track => track.stop());
          screenShareRef.current.srcObject = null;
        }
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error('❌ [SESSION] - Erreur de partage d\'écran:', error);
    }
  };

  const toggleRaiseHand = () => {
    const newRaisedHand = !raisedHand;
    setRaisedHand(newRaisedHand);
    
    if (pusherChannelRef.current) {
      pusherChannelRef.current.trigger('client-hand-raised', {
        participantId: currentUserId,
        raised: newRaisedHand,
        timestamp: new Date().toISOString()
      });
    }
  };

  const updateComprehension = (status: 'happy' | 'neutral' | 'confused') => {
    setComprehension(status);
    if (pusherChannelRef.current) {
      pusherChannelRef.current.trigger('client-comprehension-update', {
        participantId: currentUserId,
        comprehension: status,
        timestamp: new Date().toISOString()
      });
    }
  };

  const leaveSession = () => {
    router.push(currentUserRole === 'PROFESSEUR' ? '/teacher/dashboard' : '/student/dashboard');
  };

  if (!localStream) {
    return <SessionLoading />;
  }

  const currentUser = currentUserRole === "PROFESSEUR" ? initialTeacher : initialStudents.find(s => s.id === currentUserId);
  const teacher = sessionParticipants.find(p => p.isTeacher);
  const students = sessionParticipants.filter(p => !p.isTeacher);
  const raisedHands = sessionParticipants.filter(p => p.raisedHand);

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* En-tête de session */}
      <header className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold">Session de classe</h1>
          <Badge variant="secondary" className="bg-green-600">
            {sessionParticipants.length} participants
          </Badge>
          <div className="flex items-center space-x-1 text-sm text-gray-300">
            <Clock className="h-4 w-4" />
            <span>En direct</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={leaveSession}
            className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
          >
            <X className="h-4 w-4 mr-2" />
            Quitter
          </Button>
        </div>
      </header>

      {/* Contenu principal */}
      <div className="flex flex-1 overflow-hidden">
        {/* Zone vidéo principale avec WebRTC */}
        <div className="flex-1 flex flex-col p-4">
          {/* Vidéo en vedette */}
          <div className="flex-1 bg-black rounded-lg mb-4 relative">
            {isScreenSharing ? (
              <video
                ref={screenShareRef}
                autoPlay
                muted
                className="w-full h-full object-contain rounded-lg"
              />
            ) : spotlightedParticipant ? (
              <div className="w-full h-full flex items-center justify-center">
                <VideoPlayer 
                  peer={peers.find(p => p.userId === spotlightedParticipant)?.peer!}
                  userId={spotlightedParticipant}
                  allUsers={[initialTeacher, ...initialStudents]}
                  isSpotlighted={true}
                />
              </div>
            ) : teacher ? (
              <VideoPlayer 
                peer={peers.find(p => p.userId === teacher.id)?.peer!}
                userId={teacher.id}
                allUsers={[initialTeacher, ...initialStudents]}
                isSpotlighted={true}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <Users className="h-16 w-16 mx-auto mb-4" />
                  <p>En attente du professeur...</p>
                </div>
              </div>
            )}
          </div>

          {/* Grille des participants avec WebRTC */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Vidéo locale */}
            <div className="relative bg-gray-800 rounded-lg aspect-video">
              <video
                ref={userVideoRef}
                autoPlay
                muted
                className="w-full h-full object-cover rounded-lg"
              />
              <div className="absolute bottom-2 left-2 flex items-center space-x-1">
                <Badge variant="secondary" className="bg-blue-600 text-xs">
                  Vous
                </Badge>
                {isAudioMuted && (
                  <Badge variant="secondary" className="bg-red-600 text-xs">
                    <MicOff className="h-3 w-3" />
                  </Badge>
                )}
              </div>
            </div>

            {/* Autres participants via WebRTC */}
            {peers
              .filter(peer => !sessionParticipants.find(p => p.id === peer.userId)?.isTeacher)
              .map(peerData => (
                <VideoPlayer 
                  key={peerData.userId}
                  peer={peerData.peer}
                  userId={peerData.userId}
                  allUsers={[initialTeacher, ...initialStudents]}
                  showControls={true}
                />
              ))}
          </div>
        </div>

        {/* Panneau latéral amélioré */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid grid-cols-3 p-2">
              <TabsTrigger value="video" className="text-xs">
                <Users className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="chat" className="text-xs">
                <MessageSquare className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="tools" className="text-xs">
                <Hand className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>

            <TabsContent value="video" className="flex-1 p-4 space-y-2">
              <h3 className="font-semibold mb-3">Participants ({sessionParticipants.length})</h3>
              {sessionParticipants.map(participant => (
                <div key={participant.id} className="flex items-center space-x-3 p-2 rounded hover:bg-gray-700">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {participant.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {participant.name}
                      {participant.isTeacher && (
                        <Badge variant="outline" className="ml-2 text-xs bg-blue-600">
                          Prof
                        </Badge>
                      )}
                    </p>
                  </div>
                  {participant.raisedHand && (
                    <Hand className="h-4 w-4 text-yellow-500 animate-bounce" />
                  )}
                </div>
              ))}
            </TabsContent>

            <TabsContent value="chat" className="flex-1 p-4">
              <div className="text-center text-gray-400">
                <MessageSquare className="h-12 w-12 mx-auto mb-2" />
                <p>Chat en cours de développement</p>
              </div>
            </TabsContent>

            <TabsContent value="tools" className="flex-1 p-4 space-y-4">
              {/* Mains levées */}
              <div>
                <h4 className="font-semibold mb-2">Mains levées</h4>
                {raisedHands.length === 0 ? (
                  <p className="text-sm text-gray-400">Aucune main levée</p>
                ) : (
                  <div className="space-y-2">
                    {raisedHands.map(student => (
                      <div key={student.id} className="flex items-center space-x-2 p-2 bg-yellow-500/20 rounded">
                        <Hand className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm">{student.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Compréhension */}
              <div>
                <h4 className="font-semibold mb-2">Votre compréhension</h4>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant={comprehension === 'happy' ? 'default' : 'outline'}
                    onClick={() => updateComprehension('happy')}
                    className={cn(
                      comprehension === 'happy' && 'bg-green-600 hover:bg-green-700'
                    )}
                  >
                    <Smile className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={comprehension === 'neutral' ? 'default' : 'outline'}
                    onClick={() => updateComprehension('neutral')}
                  >
                    <Meh className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={comprehension === 'confused' ? 'default' : 'outline'}
                    onClick={() => updateComprehension('confused')}
                    className={cn(
                      comprehension === 'confused' && 'bg-red-600 hover:bg-red-700'
                    )}
                  >
                    <Frown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Barre de contrôle améliorée */}
      <footer className="bg-gray-800 border-t border-gray-700 p-4">
        <div className="flex items-center justify-center space-x-4">
          <Button
            variant={isAudioMuted ? "destructive" : "outline"}
            size="sm"
            onClick={toggleAudio}
            className="rounded-full w-12 h-12"
          >
            {isAudioMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>

          <Button
            variant={isVideoMuted ? "destructive" : "outline"}
            size="sm"
            onClick={toggleVideo}
            className="rounded-full w-12 h-12"
          >
            {isVideoMuted ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </Button>

          <Button
            variant={isScreenSharing ? "default" : "outline"}
            size="sm"
            onClick={toggleScreenShare}
            className="rounded-full w-12 h-12"
          >
            {isScreenSharing ? <ScreenShareOff className="h-5 w-5" /> : <ScreenShare className="h-5 w-5" />}
          </Button>

          <Button
            variant={raisedHand ? "default" : "outline"}
            size="sm"
            onClick={toggleRaiseHand}
            className={cn(
              "rounded-full w-12 h-12",
              raisedHand && "bg-yellow-600 hover:bg-yellow-700"
            )}
          >
            <Hand className="h-5 w-5" />
          </Button>

          {currentUserRole === 'PROFESSEUR' && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleEndSession}
              className="rounded-full w-12 h-12"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}