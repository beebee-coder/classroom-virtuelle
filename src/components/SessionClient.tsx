// src/components/SessionClient.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Instance as PeerInstance, SignalData as PeerSignalData } from 'simple-peer';
import * as SimplePeer from 'simple-peer';

import { pusherClient } from '@/lib/pusher/client';
import { useToast } from '@/hooks/use-toast';
import { User, Role, SessionParticipant, ClassroomWithDetails } from '@/lib/types';
import SessionLoading from './SessionLoading';
import { TeacherSessionView } from './session/TeacherSessionView';
import { StudentSessionView } from './session/StudentSessionView';
import { SessionHeader } from './session/SessionHeader';
import { PermissionPrompt } from './PermissionPrompt';
import { endCoursSession, broadcastTimerEvent, broadcastActiveTool } from '@/lib/actions';
import { ComprehensionLevel } from './StudentSessionControls';
import { SessionClientProps, PeerData, SignalPayload, PusherSubscriptionSucceededEvent, PusherMemberEvent, IncomingSignalData, SpotlightEvent, HandRaiseEvent, UnderstandingEvent, TimerEvent, ToolEvent, DocumentEvent, RemoteParticipant } from '@/types';
import { TLStoreSnapshot } from '@tldraw/tldraw';

const INITIAL_TIMER_DURATION = 3600; // 1 heure en secondes

export default function SessionClient({
  sessionId,
  initialStudents,
  initialTeacher,
  currentUserRole,
  currentUserId,
  classroom,
}: SessionClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  // États principaux
  const [loading, setLoading] = useState<boolean>(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<PeerData[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [spotlightedParticipantId, setSpotlightedParticipantId] = useState<string | null>(initialTeacher?.id || null);
  
  // États d'interaction
  const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set());
  const [understandingStatus, setUnderstandingStatus] = useState<Map<string, ComprehensionLevel>>(new Map());
  const [isEndingSession, setIsEndingSession] = useState<boolean>(false);
  const [activeTool, setActiveTool] = useState<string>('whiteboard');
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [whiteboardSnapshot, setWhiteboardSnapshot] = useState<TLStoreSnapshot | null>(null);

  // États pour le minuteur
  const [timerDuration, setTimerDuration] = useState<number>(INITIAL_TIMER_DURATION);
  const [timerTimeLeft, setTimerTimeLeft] = useState<number>(timerDuration);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const allSessionUsers: SessionParticipant[] = [initialTeacher, ...initialStudents];
  const peersRef = useRef<PeerData[]>([]);
  const screenPeerRef = useRef<PeerInstance | null>(null);
  const channelRef = useRef<any>(null);
  const isProcessingSignalRef = useRef<Set<string>>(new Set());
  const pendingSignalsRef = useRef<Map<string, PeerSignalData[]>>(new Map());

  // ---=== 1. GESTION DES FLUX MÉDIAS ===---
  useEffect(() => {
    const getMedia = async (): Promise<void> => {
      try {
        const stream: MediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720 },
          audio: true 
        });
        setLocalStream(stream);
        console.log('✅ [MEDIA] - Flux local (caméra/micro) obtenu.');
      } catch (error) {
        console.error('❌ [MEDIA] - Erreur d\'accès à la caméra/micro:', error);
        toast({
          variant: 'destructive',
          title: 'Erreur Média',
          description: 'Impossible d\'accéder à votre caméra et/ou microphone.'
        });
        // Continuer même sans média
        setLoading(false);
      } finally {
        setLoading(false);
      }
    };
    getMedia();

    return (): void => {
      localStream?.getTracks().forEach(track => {
        track.stop();
      });
      screenStream?.getTracks().forEach(track => {
        track.stop();
      });
    };
  }, []);

  const toggleScreenShare = async (): Promise<void> => {
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
        const stream: MediaStream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true,
          audio: true 
        });
        
        // Gérer l'arrêt manuel du partage d'écran
        stream.getTracks().forEach(track => {
          track.onended = () => {
            setScreenStream(null);
            if (screenPeerRef.current) {
              screenPeerRef.current.destroy();
              screenPeerRef.current = null;
            }
            toast({ title: 'Partage d\'écran arrêté' });
          };
        });
        
        setScreenStream(stream);
        toast({ title: 'Partage d\'écran activé' });
      } catch (error) {
        console.log('Partage d\'écran annulé par l\'utilisateur');
      }
    }
  };

  const signalViaAPI = async (payload: SignalPayload): Promise<void> => {
    try {
      await fetch('/api/pusher/signal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error('❌ [SIGNAL] - Erreur d\'envoi du signal:', error);
    }
  }

  // ---=== 2. GESTION DES CONNEXIONS PEER-TO-PEER CORRIGÉE ===---
  const createPeer = (targetUserId: string, initiator: boolean, stream: MediaStream): PeerInstance => {
    console.log(`🤝 [PEER] - Création d'un peer pour ${targetUserId}. Initiateur: ${initiator}`);
    
    const peer: PeerInstance = new SimplePeer.default({
      initiator,
      trickle: false,
      stream: stream || undefined,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    peer.on('signal', (signal: PeerSignalData) => {
      console.log(`📤 [PEER] - Envoi du signal de ${currentUserId} vers ${targetUserId}`);
      signalViaAPI({
        channelName: `presence-session-${sessionId}`,
        userId: currentUserId,
        target: targetUserId,
        signal,
        isReturnSignal: !initiator,
      });
    });

    peer.on('connect', () => {
      console.log(`🔗 [PEER] - Connexion établie avec ${targetUserId}`);
      // Mettre à jour l'état de connexion
      setPeers(prev => prev.map(p => 
        p.id === targetUserId ? { ...p, isConnected: true } : p
      ));
      peersRef.current = peersRef.current.map(p => 
        p.id === targetUserId ? { ...p, isConnected: true } : p
      );
    });

    peer.on('error', (error: Error) => {
      console.error(`❌ [PEER] - Erreur avec le peer ${targetUserId}:`, error);
    });

    peer.on('close', () => {
      console.log(`🔒 [PEER] - Connexion fermée avec ${targetUserId}`);
      // Nettoyer le peer fermé
      setPeers(prev => prev.filter(p => p.id !== targetUserId));
      peersRef.current = peersRef.current.filter(p => p.id !== targetUserId);
      pendingSignalsRef.current.delete(targetUserId);
    });

    peer.on('stream', (remoteStream: MediaStream) => {
      console.log(`📹 [PEER] - Flux distant reçu de ${targetUserId}`);
    });

    return peer;
  };

  const addPeer = (incomingSignal: PeerSignalData, callerId: string, stream: MediaStream): PeerInstance => {
    console.log(`📥 [PEER] - Ajout d'un peer pour répondre à ${callerId}`);
    
    const peer: PeerInstance = new SimplePeer.default({
      initiator: false,
      trickle: false,
      stream: stream || undefined,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });
    
    peer.on('signal', (signal: PeerSignalData) => {
      console.log(`✅ [PEER] - Envoi du signal de retour de ${currentUserId} à ${callerId}`);
      signalViaAPI({
        channelName: `presence-session-${sessionId}`,
        userId: currentUserId,
        target: callerId,
        signal,
        isReturnSignal: true,
      });
    });

    peer.on('connect', () => {
      console.log(`🔗 [PEER] - Connexion réponse établie avec ${callerId}`);
      setPeers(prev => prev.map(p => 
        p.id === callerId ? { ...p, isConnected: true } : p
      ));
      peersRef.current = peersRef.current.map(p => 
        p.id === callerId ? { ...p, isConnected: true } : p
      );
    });

    peer.on('error', (error: Error) => {
      console.error(`❌ [PEER] - Erreur avec le peer réponse ${callerId}:`, error);
    });

    peer.on('stream', (remoteStream: MediaStream) => {
      console.log(`📹 [PEER] - Flux distant reçu de ${callerId}`);
    });

    // Appliquer le signal initial après un petit délai
    setTimeout(() => {
      try {
        console.log(`🎯 [PEER] - Application du signal initial à ${callerId}`);
        peer.signal(incomingSignal);
      } catch (error) {
        console.error(`❌ [PEER] - Erreur lors de l'application du signal initial à ${callerId}:`, error);
      }
    }, 500);
    
    return peer;
  };

  // Fonction pour traiter les signaux en attente
  const processPendingSignals = (userId: string, peer: PeerInstance): void => {
    const pending = pendingSignalsRef.current.get(userId);
    if (pending && pending.length > 0) {
      console.log(`📨 [SIGNAL] - Traitement de ${pending.length} signaux en attente pour ${userId}`);
      pending.forEach(signal => {
        try {
          peer.signal(signal);
        } catch (error) {
          console.error(`❌ [SIGNAL] - Erreur lors de l'application du signal en attente:`, error);
        }
      });
      pendingSignalsRef.current.delete(userId);
    }
  };

  // ---=== GESTION DU MINUTEUR ===---
  const handleStartTimer = (): void => {
    broadcastTimerEvent(sessionId, 'timer-started');
  };

  const handlePauseTimer = (): void => {
    broadcastTimerEvent(sessionId, 'timer-paused');
  };

  const handleResetTimer = (): void => {
    broadcastTimerEvent(sessionId, 'timer-reset', { duration: timerDuration });
  };

  useEffect(() => {
    if (isTimerRunning && timerTimeLeft > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimerTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (!isTimerRunning || timerTimeLeft === 0) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return (): void => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isTimerRunning, timerTimeLeft]);
  
  // ---=== 3. GESTION DES ÉVÉNEMENTS PUSHER CORRIGÉE ===---
  useEffect(() => {
    // Ne pas initialiser sans sessionId
    if (!sessionId) return;

    const channelName = `presence-session-${sessionId}`;
    
    // Vérifier si déjà abonné
    if (pusherClient.channel(channelName)) {
      console.log(`⏭️ [PUSHER] - Déjà abonné au canal ${channelName}`);
      return;
    }

    const channel = pusherClient.subscribe(channelName);
    channelRef.current = channel;
    
    // Initialisation quand on rejoint
    const handleSubscriptionSucceeded = (members: PusherSubscriptionSucceededEvent): void => {
      const otherUsers = Object.keys(members.members || {}).filter(id => id !== currentUserId);
      setOnlineUserIds(Object.keys(members.members || {}));
      console.log(`✅ [PUSHER] - Abonnement réussi à la session ${sessionId}. Participants:`, otherUsers);
      
      // Attendre que le flux local soit disponible avant de créer les peers
      if (!localStream) {
        console.log('⏳ [PUSHER] - En attente du flux local...');
        return;
      }
      
      // Créer des connexions peer avec tous les utilisateurs existants
      const newPeers: PeerData[] = otherUsers.map(userId => {
        const peer = createPeer(userId, true, localStream);
        return { id: userId, peer, isConnected: false };
      });
      
      setPeers(newPeers);
      peersRef.current = newPeers;
    };

    // Quand un nouvel utilisateur rejoint
    const handleMemberAdded = (member: PusherMemberEvent): void => {
      if (member.id === currentUserId) return;
      console.log(`➕ [PUSHER] - Nouveau participant rejoint: ${member.id}`);
      
      setOnlineUserIds(prevUserIds => {
        if (!prevUserIds.includes(member.id)) {
          return [...prevUserIds, member.id];
        }
        return prevUserIds;
      });

      // Créer une connexion peer avec le nouvel utilisateur
      if (!peersRef.current.find(p => p.id === member.id) && localStream) {
        const peer = createPeer(member.id, true, localStream);
        const newPeerData: PeerData = { id: member.id, peer, isConnected: false };
        
        setPeers(prev => [...prev.filter(p => p.id !== member.id), newPeerData]);
        peersRef.current = [...peersRef.current.filter(p => p.id !== member.id), newPeerData];
      }
    };

    // Gestion des signaux WebRTC - CORRECTION PRINCIPALE
    const handleSignal = (data: IncomingSignalData): void => {
      if (data.target !== currentUserId) return;
      if (data.userId === currentUserId) return; // Ignorer ses propres signaux
      
      console.log(`📡 [PUSHER] - Signal reçu de ${data.userId}. isReturnSignal: ${!!data.isReturnSignal}, Type: ${data.signal.type}`);
      
      // Éviter le traitement en double du même signal
      const signalKey = `${data.userId}-${data.signal.type}-${Date.now()}`;
      if (isProcessingSignalRef.current.has(signalKey)) {
        console.log(`⏭️ [SIGNAL] - Signal déjà en cours de traitement, ignoré: ${signalKey}`);
        return;
      }
      
      isProcessingSignalRef.current.add(signalKey);
      
      setTimeout(() => {
        try {
          const existingPeer = peersRef.current.find(p => p.id === data.userId);

          if (!existingPeer) {
            // Créer un nouveau peer pour répondre
            if (data.isReturnSignal) {
              console.warn(`⚠️ [SIGNAL] - Signal de retour reçu mais aucun peer initiateur trouvé pour ${data.userId}.`);
              return;
            }
            
            console.log(`🆕 [SIGNAL] - Création d'un nouveau peer de réponse pour ${data.userId}`);
            
            if (!localStream) {
              console.warn(`⏳ [SIGNAL] - Flux local non disponible, mise en attente du signal pour ${data.userId}`);
              // Stocker le signal en attente
              if (!pendingSignalsRef.current.has(data.userId)) {
                pendingSignalsRef.current.set(data.userId, []);
              }
              pendingSignalsRef.current.get(data.userId)!.push(data.signal);
              return;
            }
            
            const peer = addPeer(data.signal, data.userId, localStream);
            const newPeerData: PeerData = { id: data.userId, peer, isConnected: false };
            
            setPeers(prev => [...prev.filter(p => p.id !== data.userId), newPeerData]);
            peersRef.current = [...peersRef.current.filter(p => p.id !== data.userId), newPeerData];
            
          } else {
            // Peer existe déjà - appliquer le signal
            console.log(`🎯 [SIGNAL] - Application du signal au peer existant pour ${data.userId}`);
            
            try {
              existingPeer.peer.signal(data.signal);
              
              // Traiter les signaux en attente après l'application réussie
              if (data.signal.type === 'answer' || data.signal.type === 'offer') {
                processPendingSignals(data.userId, existingPeer.peer);
              }
            } catch (error) {
              console.error(`❌ [SIGNAL] - Erreur lors de l'application du signal à ${data.userId}:`, error);
              
              // En cas d'erreur, mettre le signal en attente
              if (!pendingSignalsRef.current.has(data.userId)) {
                pendingSignalsRef.current.set(data.userId, []);
              }
              pendingSignalsRef.current.get(data.userId)!.push(data.signal);
            }
          }
        } catch (error) {
          console.error(`❌ [SIGNAL] - Erreur critique lors du traitement du signal de ${data.userId}:`, error);
        } finally {
          // Nettoyer après un délai
          setTimeout(() => {
            isProcessingSignalRef.current.delete(signalKey);
          }, 1000);
        }
      }, 100);
    };

    // Quand un utilisateur quitte
    const handleMemberRemoved = (member: PusherMemberEvent): void => {
      console.log(`➖ [PUSHER] - Participant parti: ${member.id}`);
      setOnlineUserIds(prev => prev.filter(id => id !== member.id));
      
      const peerToRemove = peersRef.current.find(p => p.id === member.id);
      if (peerToRemove) {
        peerToRemove.peer.destroy();
        setPeers(prev => prev.filter(p => p.id !== member.id));
        peersRef.current = peersRef.current.filter(p => p.id !== member.id);
        pendingSignalsRef.current.delete(member.id);
      }
    };

    const handleSessionEnded = (): void => {
      console.log('🔚 [PUSHER] - Événement de fin de session reçu.');
      toast({ title: 'Session terminée', description: 'Le professeur a mis fin à la session.' });
      router.push(currentUserRole === 'PROFESSEUR' ? '/teacher/dashboard' : '/student/dashboard');
    };

    const handleParticipantSpotlighted = (data: SpotlightEvent): void => {
      console.log(`🌟 [PUSHER] - Mise en vedette de ${data.participantId}`);
      setSpotlightedParticipantId(data.participantId);
    };

    const handleHandRaiseUpdate = (data: HandRaiseEvent): void => {
      console.log(`✋ [PUSHER] - Main ${data.isRaised ? 'levée' : 'baissée'} par ${data.userId}`);
      setRaisedHands(prev => {
        const newSet = new Set(prev);
        data.isRaised ? newSet.add(data.userId) : newSet.delete(data.userId);
        return newSet;
      });
    };

    const handleUnderstandingUpdate = (data: UnderstandingEvent): void => {
      console.log(`🤔 [PUSHER] - Statut de compréhension de ${data.userId} : ${data.status}`);
      setUnderstandingStatus(prev => new Map(prev).set(data.userId, data.status));
    };

    const handleTimerStarted = (): void => setIsTimerRunning(true);
    const handleTimerPaused = (): void => setIsTimerRunning(false);
    
    const handleTimerReset = (data: TimerEvent): void => {
      setIsTimerRunning(false);
      setTimerTimeLeft(data.duration || INITIAL_TIMER_DURATION);
      setTimerDuration(data.duration || INITIAL_TIMER_DURATION);
    };

    const handleActiveToolChanged = (data: ToolEvent): void => {
      console.log(`[PUSHER] Active tool changed to: ${data.tool}`);
      setActiveTool(data.tool);
    };

    const handleDocumentUpdated = (data: DocumentEvent): void => {
      console.log(`[PUSHER] Document URL updated: ${data.url}`);
      setDocumentUrl(data.url);
      setActiveTool('document');
      toast({ title: 'Document partagé', description: 'Le professeur a partagé un nouveau document.' });
    };

    const handleWhiteboardUpdate = (data: { senderId: string, snapshot: TLStoreSnapshot }) => {
        if (data.senderId !== currentUserId) {
            console.log(`🎨 [PUSHER] - Mise à jour du tableau blanc reçue de ${data.senderId}`);
            setWhiteboardSnapshot(data.snapshot);
        }
    };


    // Lier les événements
    channel.bind('pusher:subscription_succeeded', handleSubscriptionSucceeded);
    channel.bind('pusher:member_added', handleMemberAdded);
    channel.bind('pusher:member_removed', handleMemberRemoved);
    channel.bind('signal', handleSignal);
    channel.bind('session-ended', handleSessionEnded);
    channel.bind('participant-spotlighted', handleParticipantSpotlighted);
    channel.bind('hand-raise-update', handleHandRaiseUpdate);
    channel.bind('understanding-update', handleUnderstandingUpdate);
    channel.bind('timer-started', handleTimerStarted);
    channel.bind('timer-paused', handleTimerPaused);
    channel.bind('timer-reset', handleTimerReset);
    channel.bind('active-tool-changed', handleActiveToolChanged);
    channel.bind('document-updated', handleDocumentUpdated);
    channel.bind('whiteboard-update', handleWhiteboardUpdate);

    return (): void => {
      console.log(`🔌 [PUSHER] - Nettoyage des abonnements pour la session ${sessionId}`);
      
      // Détacher tous les écouteurs
      channel.unbind_all();
      
      pusherClient.unsubscribe(channelName);
      
      // Nettoyer tous les peers
      peersRef.current.forEach(({ peer }) => {
        try {
          peer.destroy();
        } catch (error) {
          console.warn('Erreur lors de la destruction du peer:', error);
        }
      });
      peersRef.current = [];
      pendingSignalsRef.current.clear();
    };
  }, [sessionId, localStream, currentUserId, router, toast, currentUserRole]);


// Dans le useEffect de gestion Pusher dans SessionClient.tsx, ajouter :

// Vérifier si l'utilisateur est toujours dans la session
useEffect(() => {
  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    // Empêcher la fermeture immédiate
    event.preventDefault();
    event.returnValue = '';
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      console.log('👀 [SESSION] - Page devenue invisible');
    } else {
      console.log('👀 [SESSION] - Page redevenue visible');
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, []);

// Et dans la gestion des membres ajoutés, ajouter un délai :
const handleMemberAdded = (member: PusherMemberEvent): void => {
  if (member.id === currentUserId) return;
  console.log(`➕ [PUSHER] - Nouveau participant rejoint: ${member.id}`);
  
  // Attendre un peu avant de créer le peer pour s'assurer que l'utilisateur reste
  setTimeout(() => {
    setOnlineUserIds(prevUserIds => {
      if (!prevUserIds.includes(member.id)) {
        return [...prevUserIds, member.id];
      }
      return prevUserIds;
    });

    // Créer une connexion peer avec le nouvel utilisateur
    if (!peersRef.current.find(p => p.id === member.id) && localStream) {
      const peer = createPeer(member.id, true, localStream);
      const newPeerData: PeerData = { id: member.id, peer, isConnected: false };
      
      setPeers(prev => [...prev.filter(p => p.id !== member.id), newPeerData]);
      peersRef.current = [...peersRef.current.filter(p => p.id !== member.id), newPeerData];
    }
  }, 1000); // Délai de 1 seconde
};

  // Recréer les peers quand le flux local devient disponible
  useEffect(() => {
    if (localStream && peersRef.current.length > 0) {
      console.log('🔄 [PEER] - Flux local disponible, recréation des peers...');
      
      // Recréer tous les peers avec le nouveau flux
      const newPeers: PeerData[] = peersRef.current.map(({ id }) => {
        const peer = createPeer(id, true, localStream);
        return { id, peer, isConnected: false };
      });
      
      setPeers(newPeers);
      peersRef.current = newPeers;
    }
  }, [localStream]);

  const onSpotlightParticipant = useCallback(async (participantId: string): Promise<void> => {
    if (currentUserRole !== 'PROFESSEUR') return;
    try {
      await fetch(`/api/session/${sessionId}/spotlight`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ participantId }),
      });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de mettre le participant en vedette.' });
    }
  }, [sessionId, currentUserRole, toast]);
  
  const handleEndSession = useCallback(async (): Promise<void> => {
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
  }, [currentUserRole, sessionId, toast]);

  const handleLeaveSession = useCallback((): void => {
    console.log('🚪 [CLIENT] - Départ de la session demandé');
    localStream?.getTracks().forEach(track => track.stop());
    peersRef.current.forEach(({ peer }) => {
      try {
        peer.destroy();
      } catch (error) {
        console.warn('Erreur lors de la destruction du peer:', error);
      }
    });
    
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
    : spotlightedPeer?.peer.streams?.[0] || null;

  if (loading) {
    return <SessionLoading />;
  }

  const handleToggleHandRaise = (isRaised: boolean): void => {
    setRaisedHands(prev => {
      const newSet = new Set(prev);
      isRaised ? newSet.add(currentUserId) : newSet.delete(currentUserId);
      return newSet;
    });
  };

  const handleUnderstandingChange = (status: ComprehensionLevel): void => {
    setUnderstandingStatus(prev => new Map(prev).set(currentUserId, status));
  };

  const handleToolChange = (tool: string): void => {
    setActiveTool(tool);
    broadcastActiveTool(sessionId, tool);
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Préparer les participants distants pour la vue professeur
  const remoteParticipants: RemoteParticipant[] = peers.map(p => ({ 
    id: p.id, 
    stream: p.peer.streams?.[0] 
  }));

  const spotlightedUser: SessionParticipant | undefined = allSessionUsers.find(u => u.id === spotlightedParticipantId);

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
            remoteParticipants={remoteParticipants}
            spotlightedUser={spotlightedUser}
            allSessionUsers={allSessionUsers}
            onlineUserIds={onlineUserIds}
            onSpotlightParticipant={onSpotlightParticipant}
            raisedHands={raisedHands}
            understandingStatus={understandingStatus}
            currentUserId={currentUserId}
            onScreenShare={toggleScreenShare}
            isScreenSharing={!!screenStream}
            activeTool={activeTool}
            onToolChange={handleToolChange}
            classroom={classroom}
            documentUrl={documentUrl}
          />
        ) : (
          <StudentSessionView
            sessionId={sessionId}
            localStream={localStream}
            spotlightedStream={spotlightedStream}
            spotlightedUser={spotlightedUser}
            isHandRaised={raisedHands.has(currentUserId)}
            onToggleHandRaise={handleToggleHandRaise}
            onUnderstandingChange={handleUnderstandingChange}
            onLeaveSession={handleLeaveSession}
            currentUnderstanding={understandingStatus.get(currentUserId) || ComprehensionLevel.NONE}
            currentUserId={currentUserId}
            activeTool={activeTool}
            documentUrl={documentUrl}
            whiteboardSnapshot={whiteboardSnapshot}
          />
        )}
      </main>
    </div>
  );
}
