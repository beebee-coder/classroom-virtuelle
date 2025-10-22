// src/components/SessionClient.tsx - Version complète et corrigée
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { pusherClient } from '@/lib/pusher/client';
import type { CoursSessionWithRelations, Role, StudentForCard, User } from '@/lib/types';
import SimplePeer, { Instance as PeerInstance, SignalData } from 'simple-peer';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Header } from './Header';
import { ParticipantGrid } from './ParticipantGrid';
import { TeacherSessionControls } from './TeacherSessionControls';
import { StudentSessionControls } from './StudentSessionControls';
import SessionLoading from './SessionLoading';
import { endCoursSession } from '@/lib/actions';

interface SessionClientProps {
  sessionId: string;
  initialSession: CoursSessionWithRelations;
  initialStudents: StudentForCard[];
  initialTeacher: User;
  currentUserRole: Role;
  currentUserId: string;
}

interface PeerData {
  peer: PeerInstance;
  userId: string;
}

export default function SessionClient({
  sessionId,
  initialSession,
  initialStudents,
  initialTeacher,
  currentUserRole,
  currentUserId,
}: SessionClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [session, setSession] = useState(initialSession);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<PeerData[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const peersRef = useRef<PeerData[]>([]);

  const [spotlightId, setSpotlightId] = useState<string | null>(initialTeacher.id);
  const [screenShareStream, setScreenShareStream] = useState<MediaStream | null>(null);

  const [raisedHands, setRaisedHands] = useState<string[]>([]);
  const [comprehension, setComprehension] = useState<Record<string, 'compris' | 'confus' | 'perdu'>>({});

  const userVideoRef = useRef<HTMLVideoElement>(null);
  const screenShareVideoRef = useRef<HTMLVideoElement>(null);

  const channelName = `presence-session-${sessionId}`;

  // Initialize Media Stream
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        console.log('[SESSION] - Initialisation du flux média...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        setLocalStream(stream);
        
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = stream;
        }
        
        console.log('[SESSION] - Flux média initialisé avec succès');
      } catch (error) {
        console.error('[SESSION] - Erreur lors de l\'accès aux médias:', error);
        toast({
          variant: 'destructive',
          title: 'Erreur d\'accès aux médias',
          description: 'Impossible d\'accéder à la caméra ou au microphone.',
        });
      }
    };

    initializeMedia();
  }, [toast]);

  // Cleanup media streams on unmount
  useEffect(() => {
    return () => {
      console.log('[SESSION] - Nettoyage des flux média...');
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (screenShareStream) {
        screenShareStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [localStream, screenShareStream]);

  // Pusher connection and event handling
  useEffect(() => {
    console.log('[SESSION] - Connexion à Pusher...');
    
    const channel = pusherClient.subscribe(channelName);

    channel.bind('participant-spotlighted', (data: { participantId: string }) => {
      console.log('[SESSION] - Participant spotlighted:', data.participantId);
      setSpotlightId(data.participantId);
    });

    channel.bind('session-ended', (data: { sessionId: string }) => {
      console.log('[SESSION] - Session terminée:', data.sessionId);
      toast({
        title: 'Session terminée',
        description: 'Le professeur a mis fin à la session.',
      });
      router.push(currentUserRole === 'PROFESSEUR' ? '/teacher/dashboard' : '/student/dashboard');
    });

    channel.bind('hand-raised', (data: { userId: string }) => {
      console.log('[SESSION] - Main levée:', data.userId);
      setRaisedHands(prev => [...prev.filter(id => id !== data.userId), data.userId]);
    });

    channel.bind('hand-lowered', (data: { userId: string }) => {
      console.log('[SESSION] - Main baissée:', data.userId);
      setRaisedHands(prev => prev.filter(id => id !== data.userId));
    });

    channel.bind('comprehension-updated', (data: { userId: string; level: 'compris' | 'confus' | 'perdu' }) => {
      console.log('[SESSION] - Compréhension mise à jour:', data.userId, data.level);
      setComprehension(prev => ({
        ...prev,
        [data.userId]: data.level
      }));
    });

    return () => {
      console.log('[SESSION] - Déconnexion de Pusher...');
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [channelName, router, toast, currentUserRole]);

  // Handle screen sharing
  const handleScreenShare = useCallback(async () => {
    try {
      if (screenShareStream) {
        // Stop screen share
        screenShareStream.getTracks().forEach(track => track.stop());
        setScreenShareStream(null);
        toast({
          title: 'Partage d\'écran arrêté',
        });
      } else {
        // Start screen share
        const stream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true,
          audio: true 
        });
        
        stream.getVideoTracks()[0].onended = () => {
          setScreenShareStream(null);
          toast({
            title: 'Partage d\'écran interrompu',
          });
        };
        
        setScreenShareStream(stream);
        
        if (screenShareVideoRef.current) {
          screenShareVideoRef.current.srcObject = stream;
        }
        
        toast({
          title: 'Partage d\'écran démarré',
        });
      }
    } catch (error) {
      console.error('[SESSION] - Erreur de partage d\'écran:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur de partage d\'écran',
        description: 'Impossible de démarrer le partage d\'écran.',
      });
    }
  }, [screenShareStream, toast]);

  // Handle raising/lowering hand
  const handleRaiseHand = useCallback(() => {
    const channel = pusherClient.channel(channelName);
    if (channel) {
      if (raisedHands.includes(currentUserId)) {
        channel.trigger('client-hand-lowered', { userId: currentUserId });
      } else {
        channel.trigger('client-hand-raised', { userId: currentUserId });
      }
    }
  }, [channelName, currentUserId, raisedHands]);

  // Handle comprehension update
  const handleComprehensionUpdate = useCallback((level: 'compris' | 'confus' | 'perdu') => {
    const channel = pusherClient.channel(channelName);
    if (channel) {
      channel.trigger('client-comprehension-updated', { 
        userId: currentUserId, 
        level 
      });
    }
  }, [channelName, currentUserId]);

  // Handle ending session (teacher only)
  const handleEndSession = useCallback(async () => {
    if (currentUserRole !== 'PROFESSEUR') return;

    try {
      await endCoursSession(sessionId);
      toast({
        title: 'Session terminée',
        description: 'La session a été fermée pour tous les participants.',
      });
      router.push('/teacher/dashboard');
    } catch (error) {
      console.error('[SESSION] - Erreur lors de la fermeture de la session:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de terminer la session.',
      });
    }
  }, [sessionId, currentUserRole, router, toast]);

  // Handle spotlight participant (teacher only)
  const handleSpotlight = useCallback((participantId: string) => {
    if (currentUserRole !== 'PROFESSEUR') return;

    const channel = pusherClient.channel(channelName);
    if (channel) {
      channel.trigger('client-participant-spotlighted', { participantId });
    }
  }, [channelName, currentUserRole]);

  if (!localStream) {
    return <SessionLoading />;
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header 
        sessionName={session.nom || 'Session de cours'}
        currentUserRole={currentUserRole}
        onEndSession={currentUserRole === 'PROFESSEUR' ? handleEndSession : undefined}
      />
      
      <div className="flex-1 flex flex-col lg:flex-row p-4 gap-4">
        {/* Main content area */}
        <div className="flex-1 flex flex-col">
          {/* Spotlight/Shared screen area */}
          <div className="flex-1 bg-muted rounded-lg mb-4 flex items-center justify-center">
            {screenShareStream ? (
              <video
                ref={screenShareVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-contain rounded-lg"
              />
            ) : spotlightId ? (
              <div className="text-center">
                <p className="text-lg font-semibold">
                  {spotlightId === initialTeacher.id 
                    ? 'Professeur en vedette' 
                    : 'Élève en vedette'}
                </p>
                {/* In a real implementation, you would show the spotlighted user's video */}
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <p>Aucune présentation en cours</p>
              </div>
            )}
          </div>

          {/* Local user video */}
          <div className="w-48 h-36 bg-muted rounded-lg overflow-hidden">
            <video
              ref={userVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Controls and participants sidebar */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
          <ParticipantGrid
            participants={[
              { ...initialTeacher, role: 'PROFESSEUR' as const },
              ...initialStudents.map(student => ({ ...student, role: 'ELEVE' as const }))
            ]}
            currentUserId={currentUserId}
            raisedHands={raisedHands}
            comprehension={comprehension}
            onSpotlight={currentUserRole === 'PROFESSEUR' ? handleSpotlight : undefined}
          />

          {currentUserRole === 'PROFESSEUR' ? (
            <TeacherSessionControls
              onScreenShare={handleScreenShare}
              isScreenSharing={!!screenShareStream}
              raisedHands={raisedHands}
              onLowerHand={(userId) => {
                const channel = pusherClient.channel(channelName);
                if (channel) {
                  channel.trigger('client-hand-lowered', { userId });
                }
              }}
            />
          ) : (
            <StudentSessionControls
              onRaiseHand={handleRaiseHand}
              isHandRaised={raisedHands.includes(currentUserId)}
              onComprehensionUpdate={handleComprehensionUpdate}
              currentComprehension={comprehension[currentUserId]}
            />
          )}
        </div>
      </div>
    </div>
  );
}