// src/components/SessionClient.tsx - VERSION COMPLÈTE CORRIGÉE
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Instance as PeerInstance, SignalData as PeerSignalData } from 'simple-peer';
import SimplePeer from 'simple-peer';
import { useToast } from '@/hooks/use-toast';
import { User, Role } from '@prisma/client';
import type { SessionClientProps, IncomingSignalData, SignalPayload, SessionParticipant, DocumentInHistory, WhiteboardOperation } from '@/types';
import SessionLoading from './SessionLoading';
import { SessionHeader } from './session/SessionHeader';
import { PermissionPrompt } from './PermissionPrompt';
import { ablyTrigger } from '@/lib/ably/triggers';
import { broadcastTimerEvent, broadcastActiveTool, updateStudentSessionStatus } from '@/lib/actions/ably-session.actions';
import { endCoursSession } from '@/lib/actions/session.actions';
import { ComprehensionLevel } from '@/types';
import { useAbly } from '@/hooks/useAbly';
import Ably, { type Types } from 'ably';
import { getSessionChannelName } from '@/lib/ably/channels';
import { AblyEvents } from '@/lib/ably/events';

// Importation statique
import { TeacherSessionView } from './session/TeacherSessionView';
import { StudentSessionView } from './session/StudentSessionView';
import { useAblyWhiteboardSync } from '@/hooks/useAblyWhiteboardSync';

const signalViaAPI = async (payload: SignalPayload): Promise<void> => {
    try {
        await fetch('/api/ably/signal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.error('❌ [SIGNAL] - Erreur d\'envoi du signal via API:', error);
    }
};

const validateTimerDuration = (duration: unknown): number => {
    if (typeof duration !== 'number' || isNaN(duration) || duration <= 0) {
        console.warn('⚠️ [TIMER] - Durée invalide détectée, utilisation de la valeur par défaut:', duration);
        return 3600;
    }
    return duration;
};

// CORRECTION : Interface pour l'état des peers
interface PeerState {
    isConnected: boolean;
    isConnecting: boolean;
    connectionAttempts: number;
    lastAttempt: number;
}

export default function SessionClient({
  sessionId,
  initialStudents,
  initialTeacher,
  currentUserRole,
  currentUserId,
  classroom,
  initialDocumentHistory = [],
}: SessionClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  const isMountedRef = useRef(true);
  const setupCompletedRef = useRef(false);
  
  const { client: ablyClient, isConnected: isAblyConnected, connectionState } = useAbly();
  const ablyLoading = connectionState === 'initialized' || connectionState === 'connecting';  
  const [loading, setLoading] = useState<boolean>(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isSharingScreen, setIsSharingScreen] = useState<boolean>(false);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [spotlightedParticipantId, setSpotlightedParticipantId] = useState<string | null>(initialTeacher?.id || null);
  const [isMediaReady, setIsMediaReady] = useState(false);

  const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set());
  const [understandingStatus, setUnderstandingStatus] = useState<Map<string, ComprehensionLevel>>(new Map());
  const [isEndingSession, setIsEndingSession] = useState<boolean>(false);
  
  const getInitialActiveTool = () => (typeof window !== 'undefined' ? localStorage.getItem(`activeTool_${sessionId}`) : null) || 'camera';
  const [activeTool, setActiveTool] = useState<string>(getInitialActiveTool());

  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentHistory, setDocumentHistory] = useState(initialDocumentHistory);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const INITIAL_TIMER_DURATION = 3600;
  const [timerDuration, setTimerDuration] = useState<number>(INITIAL_TIMER_DURATION);
  const [timerTimeLeft, setTimerTimeLeft] = useState<number>(timerDuration);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  const [whiteboardOperations, setWhiteboardOperations] = useState<WhiteboardOperation[]>([]);
  
  // Références stables
  const handleIncomingWhiteboardOperationsRef = useRef<(externalOps: WhiteboardOperation[]) => void>();
  const handlePresenceUpdateRef = useRef<(member: Types.PresenceMessage) => void>();
  const handleSignalRef = useRef<(message: Types.Message) => void>();
  
  useEffect(() => {
    handleIncomingWhiteboardOperationsRef.current = (externalOps: WhiteboardOperation[]) => {
      if (!isMountedRef.current) return;
      
      setWhiteboardOperations(prevOps => {
        const existingIds = new Set(prevOps.map(op => op.id));
        const newOps = externalOps.filter(op => !existingIds.has(op.id));
        if (newOps.length > 0) {
          console.log(`[SessionClient] Applying ${newOps.length} new whiteboard operations.`);
        }
        return [...prevOps, ...newOps];
      });
    };
  }, []);

  const { sendOperation, flushOperations } = useAblyWhiteboardSync(
    sessionId, 
    currentUserId, 
    (ops) => handleIncomingWhiteboardOperationsRef.current?.(ops)
  );
  
  const [whiteboardControllerId, setWhiteboardControllerId] = useState<string | null>(initialTeacher?.id || null);
  
  const peersRef = useRef<Map<string, PeerInstance>>(new Map());
  // CORRECTION : Typage correct de l'état des peers
  const peerStatesRef = useRef<Map<string, PeerState>>(new Map());
  const channelRef = useRef<Ably.Types.RealtimeChannelCallbacks | null>(null);
  const mediaCleanupRef = useRef<(() => void) | null>(null);

  const teacherName = initialTeacher?.name || '';
  const studentNames = useMemo(() => 
    initialStudents.reduce((acc, student) => {
      if (student?.id && student?.name) acc[student.id] = student.name;
      return acc;
    }, {} as Record<string, string>),
    [initialStudents]
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`activeTool_${sessionId}`, activeTool);
    }
  }, [activeTool, sessionId]);
  
  // CORRECTION : Fonction de nettoyage des peers améliorée
  const cleanupPeerConnection = useCallback((userId: string): void => {
    const peer = peersRef.current.get(userId);
    if (peer && !peer.destroyed) {
        console.log(`🧹 [PEER CLEANUP] - Destroying peer for user: ${userId}`);
        try {
            peer.destroy();
        } catch (error) {
            console.warn(`⚠️ [PEER CLEANUP] - Error destroying peer for ${userId}:`, error);
        }
    }
    peersRef.current.delete(userId);
    peerStatesRef.current.delete(userId);
    
    setRemoteStreams(prev => {
        const newMap = new Map(prev);
        if (newMap.has(userId)) {
            console.log(`📹 [STREAM CLEANUP] - Removing remote stream for user: ${userId}`);
            const stream = newMap.get(userId);
            stream?.getTracks().forEach(track => track.stop());
            newMap.delete(userId);
            return newMap;
        }
        return prev;
    });
  }, []);

  // CORRECTION : Fonction de création de peer avec gestion d'état WebRTC améliorée
  const createPeer = useCallback((targetUserId: string, initiator: boolean, stream: MediaStream | null): PeerInstance | undefined => {
    if (!isMountedRef.current) {
        console.warn(`⚠️ [PEER CREATION] - Component unmounted, skipping peer creation for: ${targetUserId}`);
        return undefined;
    }

    // CORRECTION : Vérification renforcée des tentatives de connexion
    const existingState = peerStatesRef.current.get(targetUserId);
    const now = Date.now();
    const MAX_ATTEMPTS = 2; // Réduit à 2 tentatives
    const RETRY_DELAY = 15000; // 15 secondes

    if (existingState) {
        if (existingState.connectionAttempts >= MAX_ATTEMPTS && 
            now - existingState.lastAttempt < RETRY_DELAY) {
            console.warn(`🛑 [PEER LIMIT] - Too many connection attempts for ${targetUserId}, waiting...`);
            return undefined;
        }
        
        // CORRECTION : Empêcher la création de multiples peers pour le même utilisateur
        if (existingState.isConnecting) {
            console.log(`⏳ [PEER BUSY] - Peer for ${targetUserId} is already connecting, skipping`);
            return undefined;
        }
    }

    // Vérifier si on a déjà un peer valide et connecté
    const existingPeer = peersRef.current.get(targetUserId);
    if (existingPeer && !existingPeer.destroyed) {
        const peerState = peerStatesRef.current.get(targetUserId);
        if (peerState?.isConnected) {
            console.log(`🔁 [PEER REUSE] - Reusing existing connected peer for: ${targetUserId}`);
            return existingPeer;
        }
    }

    console.log(`🤝 [PEER CREATION] - Creating peer for target: ${targetUserId}. Initiator: ${initiator}, Has stream: ${!!stream}`);

    try {
        // CORRECTION : Marquer immédiatement comme en cours de connexion
        peerStatesRef.current.set(targetUserId, { 
            isConnected: false, 
            isConnecting: true,
            connectionAttempts: (existingState?.connectionAttempts || 0) + 1,
            lastAttempt: now
        });

        // CORRECTION : Configuration WebRTC optimisée avec gestion d'état robuste
        const peer = new SimplePeer({
            initiator,
            trickle: false, // DÉSACTIVÉ pour réduire les conflits
            stream: stream || undefined,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:stun3.l.google.com:19302' },
                    { urls: 'stun:stun4.l.google.com:19302' }
                ],
                iceCandidatePoolSize: 3, // Réduit pour moins de complexité
                iceTransportPolicy: 'all'
            },
            offerOptions: {
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
                iceRestart: false
            },
            channelConfig: {
                ordered: false,
                maxRetransmits: 2
            }
        });

        let hasReceivedStream = false;
        let isConnectionEstablished = false;
        let connectionTimeout: NodeJS.Timeout;
        let signalCount = 0;
        const MAX_SIGNALS = 10; // Réduit à 10 signaux

        peer.on('signal', (signal: PeerSignalData) => {
            if (!isMountedRef.current || peer.destroyed) return;
            
            signalCount++;
            
            // CORRECTION : Filtrage amélioré des signaux
            if (signalCount > MAX_SIGNALS) {
                console.warn(`🛑 [SIGNAL LIMIT] - Too many signals for ${targetUserId} (${signalCount}), stopping`);
                return;
            }
            
            // CORRECTION : Ignorer les candidats ICE après les premiers signaux
            if (signal.type === 'candidate' && signalCount > 5) {
                console.log(`⏭️ [SIGNAL FILTER] - Skipping candidate signal ${signalCount} for ${targetUserId}`);
                return;
            }
            
            console.log(`📡 [PEER SIGNAL] - Sending signal ${signalCount}/${MAX_SIGNALS} from ${currentUserId} to ${targetUserId} (type: ${signal.type})`);
            
            // CORRECTION : Délai entre les signaux pour éviter les conflits
            setTimeout(() => {
                if (isMountedRef.current && !peer.destroyed) {
                    signalViaAPI({
                        channelName: getSessionChannelName(sessionId),
                        userId: currentUserId,
                        target: targetUserId,
                        signal,
                        isReturnSignal: !initiator
                    });
                }
            }, signalCount * 50); // Délai progressif
        });

        peer.on('stream', (remoteStream: MediaStream) => {
            if (isMountedRef.current && !hasReceivedStream) {
                hasReceivedStream = true;
                isConnectionEstablished = true;
                console.log(`➡️ [PEER STREAM] - Received stream from ${targetUserId} after ${signalCount} signals`);
                
                setRemoteStreams(prev => {
                    const newMap = new Map(prev);
                    newMap.set(targetUserId, remoteStream);
                    return newMap;
                });
                
                peerStatesRef.current.set(targetUserId, { 
                    isConnected: true, 
                    isConnecting: false,
                    connectionAttempts: 0,
                    lastAttempt: now
                });
                clearTimeout(connectionTimeout);
                
                // CORRECTION : COMMENTÉ - Toast intempestif désactivé
                // toast({
                //     title: 'Connexion établie',
                //     description: `Connexion vidéo avec ${targetUserId === initialTeacher?.id ? teacherName : studentNames[targetUserId] || targetUserId}`
                // });
            }
        });

        peer.on('connect', () => {
            console.log(`✅ [PEER CONNECT] - Peer connection established with ${targetUserId} after ${signalCount} signals`);
            isConnectionEstablished = true;
            peerStatesRef.current.set(targetUserId, { 
                isConnected: true, 
                isConnecting: false,
                connectionAttempts: 0,
                lastAttempt: now
            });
            clearTimeout(connectionTimeout);
        });

        peer.on('error', (err: Error) => {
            console.error(`❌ [PEER ERROR] - Peer error with ${targetUserId} after ${signalCount} signals:`, err);
            
            // CORRECTION : Gestion d'erreur spécifique pour les conflits d'état
            if (err.message.includes('InvalidStateError') || err.message.includes('stable')) {
                console.warn(`🔄 [PEER STATE CONFLICT] - WebRTC state conflict for ${targetUserId}, will cleanup and retry later`);
            }
            
            const currentState = peerStatesRef.current.get(targetUserId);
            peerStatesRef.current.set(targetUserId, { 
                isConnected: false, 
                isConnecting: false,
                connectionAttempts: currentState?.connectionAttempts || 1,
                lastAttempt: now
            });
            
            clearTimeout(connectionTimeout);
            
            // CORRECTION : Nettoyage immédiat pour les erreurs d'état
            setTimeout(() => {
                if (isMountedRef.current && !isConnectionEstablished) {
                    console.log(`🧹 [PEER ERROR CLEANUP] - Cleaning up failed peer for ${targetUserId}`);
                    cleanupPeerConnection(targetUserId);
                }
            }, 500);
        });
        
        peer.on('close', () => {
            console.log(`🚪 [PEER CLOSE] - Peer connection closed for ${targetUserId}`);
            peerStatesRef.current.set(targetUserId, { 
                isConnected: false, 
                isConnecting: false,
                connectionAttempts: 0,
                lastAttempt: now
            });
            clearTimeout(connectionTimeout);
        });

        // CORRECTION : Timeout avec gestion d'état
        connectionTimeout = setTimeout(() => {
            if (!isConnectionEstablished && isMountedRef.current) {
                console.warn(`⏰ [PEER TIMEOUT] - Connection timeout for ${targetUserId} after ${signalCount} signals`);
                const currentState = peerStatesRef.current.get(targetUserId);
                peerStatesRef.current.set(targetUserId, { 
                    isConnected: false, 
                    isConnecting: false,
                    connectionAttempts: currentState?.connectionAttempts || 1,
                    lastAttempt: now
                });
                
                cleanupPeerConnection(targetUserId);
            }
        }, 15000); // Timeout réduit à 15s
        
        // Nettoyer l'ancien peer si existant
        if (existingPeer && !existingPeer.destroyed) {
            try {
                console.log(`🔄 [PEER REPLACE] - Replacing existing peer for ${targetUserId}`);
                existingPeer.destroy();
            } catch (error) {
                console.warn(`⚠️ [PEER CLEANUP] - Error destroying old peer for ${targetUserId}:`, error);
            }
        }
        
        peersRef.current.set(targetUserId, peer);
        return peer;
    } catch (error) {
        console.error('❌ [PEER CREATION] - Error creating peer:', error);
        peerStatesRef.current.set(targetUserId, { 
            isConnected: false, 
            isConnecting: false,
            connectionAttempts: (existingState?.connectionAttempts || 0) + 1,
            lastAttempt: now
        });
        return undefined;
    }
  }, [sessionId, currentUserId, teacherName, studentNames, initialTeacher?.id, toast, cleanupPeerConnection]);

  // CORRECTION : Gestion des médias optimisée
  useEffect(() => {
    if (setupCompletedRef.current) return;
    
    isMountedRef.current = true;
    console.log(`🎬 [LIFECYCLE] - MOUNT SessionClient for session: ${sessionId}, user: ${currentUserId}`);
    
    let stream: MediaStream | null = null;
    let mounted = true;
    
    const getMedia = async () => {
      console.log('🎥 [MEDIA] - Requesting user media (camera/micro)...');
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720 }, 
          audio: true 
        });
        if (mounted) {
          console.log('✅ [MEDIA] - User media acquired.');
          setLocalStream(stream);
          setIsMediaReady(true);
          setIsMuted(false);
          setIsVideoOff(false);
          console.log('🔄 [MEDIA] - Media ready, peer connections can now be established.');
        }
      } catch (error) {
        console.warn('⚠️ [MEDIA] - User media access denied. Entering observer mode.');
        if (mounted) {
          setLocalStream(null);
          setIsMediaReady(true);
          console.log('🔄 [MEDIA] - Observer mode activated, peer connections can still be established.');
        }
      }
    };

    mediaCleanupRef.current = () => {
        console.log('🛑 [MEDIA CLEANUP] - Stopping all media tracks.');
        stream?.getTracks().forEach(track => track.stop());
        screenStream?.getTracks().forEach(track => track.stop());
    };
    
    getMedia();
    setupCompletedRef.current = true;

    return () => {
      mounted = false;
      isMountedRef.current = false;
      setupCompletedRef.current = false;
      
      // CORRECTION : Nettoyage complet de tous les peers
      Array.from(peersRef.current.keys()).forEach(userId => {
          cleanupPeerConnection(userId);
      });
      
      mediaCleanupRef.current?.();
      console.log(`🧹 [LIFECYCLE] - UNMOUNT SessionClient for session: ${sessionId}`);
    };
  }, [sessionId, currentUserId, cleanupPeerConnection]);

  useEffect(() => {
    if (!screenStream) return;
    
    const handleTrackEnded = () => {
      if (isMountedRef.current) {
        console.log('🖥️ [SCREEN SHARE] - Screen share track ended by user.');
        screenStream.getTracks().forEach(track => track.stop());
        setScreenStream(null);
        setIsSharingScreen(false);
      }
    };

    screenStream.getTracks().forEach(track => {
      track.addEventListener('ended', handleTrackEnded);
    });

    return () => {
      screenStream.getTracks().forEach(track => {
        track.removeEventListener('ended', handleTrackEnded);
      });
    };
  }, [screenStream]);

  // CORRECTION : Gestion améliorée du partage d'écran
  const toggleScreenShare = useCallback(async () => {
    if (isSharingScreen && screenStream) {
      console.log('🖥️ [SCREEN SHARE] - Stopping screen share...');
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
      setIsSharingScreen(false);
    } else {
      console.log('🖥️ [SCREEN SHARE] - Starting screen share...');
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true, 
          audio: true 
        });
        
        if (!isMountedRef.current) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        setScreenStream(stream);
        setIsSharingScreen(true);
        
        // CORRECTION : Mise à jour des peers avec gestion d'erreur
        peersRef.current.forEach((peer, userId) => {
          if (!peer.destroyed && peer.streams?.[0]) {
            try {
              const screenTrack = stream.getVideoTracks()[0];
              console.log(`🔄 [TRACK REPLACE] - Switching to screen share for peer: ${userId}`);
              peer.replaceTrack(
                peer.streams[0].getVideoTracks()[0], 
                screenTrack, 
                peer.streams[0]
              );
            } catch (error) {
              console.error('❌ [TRACK REPLACE] - Error switching track:', error);
            }
          }
        });
      } catch (error) { 
        console.error('❌ [SCREEN SHARE] - Error sharing screen:', error);
        toast({ 
          variant: 'destructive', 
          title: 'Erreur de partage d\'écran',
          description: 'Impossible de démarrer le partage d\'écran.'
        });
      }
    }
  }, [isSharingScreen, screenStream, toast]);

  // CORRECTION : Gestion de la présence optimisée
  useEffect(() => {
    handlePresenceUpdateRef.current = (member: Types.PresenceMessage) => {
      if (!isMountedRef.current || !channelRef.current) return;
      
      console.log(`👥 [PRESENCE] - Presence update: ${member.action} from ${member.clientId}`);

      channelRef.current.presence.get((err, members) => {
          if (!isMountedRef.current) return;
          if (err) {
              console.error('❌ [PRESENCE] - Error getting presence:', err);
              return;
          }
          
          if (!members || !Array.isArray(members)) {
              console.warn('⚠️ [PRESENCE] - Members data is invalid:', members);
              setOnlineUserIds([]);
              return;
          }
          
          const memberIds = members
              .map((m: Types.PresenceMessage) => m.clientId)
              .filter((id: string | undefined): id is string => !!id);
          
          console.log(`📊 [PRESENCE] - Online members:`, memberIds);
          setOnlineUserIds(memberIds);
          
          const otherUserIds = memberIds.filter((id: string) => id !== currentUserId);
          
          // CORRECTION : Création de peers avec vérifications améliorées
          otherUserIds.forEach((userId: string) => {
              if (!peersRef.current.has(userId) && isMediaReady) {
                  const existingState = peerStatesRef.current.get(userId);
                  const now = Date.now();
                  const MIN_RETRY_DELAY = 5000; // 5 secondes
                  
                  if (existingState && 
                      existingState.connectionAttempts > 0 && 
                      now - existingState.lastAttempt < MIN_RETRY_DELAY) {
                      console.log(`⏳ [PEER DELAY] - Waiting before retrying connection for: ${userId}`);
                      return;
                  }
                  
                  console.log(`🆕 [PEER INIT] - New user ${userId} detected, will create peer in 2s.`);
                  setTimeout(() => {
                    if (isMountedRef.current && memberIds.includes(userId) && isMediaReady) {
                      const streamToUse = isSharingScreen ? screenStream : localStream;
                      console.log(`🔄 [PEER CREATE] - Creating peer for ${userId}`);
                      createPeer(userId, true, streamToUse);
                    }
                  }, 2000);
              } else if (!isMediaReady) {
                  console.log(`⏳ [PEER DELAY] - Media not ready yet, delaying peer creation for: ${userId}`);
              }
          });

          // Nettoyer les utilisateurs déconnectés
          const offlineUserIds = Array.from(peersRef.current.keys()).filter(id => !memberIds.includes(id));
          offlineUserIds.forEach(userId => {
              console.log(`🧹 [PRESENCE CLEANUP] - User ${userId} offline, cleaning up peer.`);
              cleanupPeerConnection(userId);
          });
      });
    };
  }, [currentUserId, isMediaReady, isSharingScreen, screenStream, localStream, teacherName, studentNames, initialTeacher?.id, createPeer, cleanupPeerConnection]);

  // CORRECTION : Gestion des signaux avec prévention des conflits d'état WebRTC
  useEffect(() => {
    handleSignalRef.current = (message: Types.Message) => {
        if (!isMountedRef.current) return;
        
        const data = message.data as IncomingSignalData;
        if (data.target !== currentUserId) return;
        
        console.log(`🔔 [SIGNAL] - Received signal from ${data.userId} for ${data.target} (type: ${data.signal?.type})`);
        
        const peerState = peerStatesRef.current.get(data.userId);
        
        // CORRECTION : Vérification améliorée de l'état de connexion
        if (peerState?.isConnected) {
            console.log(`🔗 [SIGNAL SKIP] - Already connected to ${data.userId}, ignoring signal`);
            return;
        }
        
        let peer = peersRef.current.get(data.userId);
        
        // CORRECTION : Logique de création de peer améliorée pour éviter les conflits
        if (!peer || peer.destroyed) {
            console.log(`⚠️ [SIGNAL] - No valid peer found for ${data.userId}, creating new peer.`);
            const streamToUse = isSharingScreen ? screenStream : localStream;
            peer = createPeer(data.userId, false, streamToUse);
            
            // CORRECTION : Attendre que le peer soit prêt avant de traiter le signal
            if (peer && !peer.destroyed) {
                setTimeout(() => {
                    if (isMountedRef.current && peer && !peer.destroyed) {
                        try {
                            console.log(`🔄 [SIGNAL PROCESS] - Processing signal for ${data.userId} after peer initialization`);
                            peer.signal(data.signal);
                        } catch (error) {
                            console.error(`❌ [SIGNAL] - Error signaling peer ${data.userId}:`, error);
                        }
                    }
                }, 100);
            }
        } else {
            // CORRECTION : Peer existant - traiter le signal immédiatement
            try {
                peer.signal(data.signal);
            } catch (error) {
                console.error(`❌ [SIGNAL] - Error signaling existing peer ${data.userId}:`, error);
            }
        }
    };
  }, [currentUserId, isSharingScreen, screenStream, localStream, createPeer]);

  // CORRECTION : Setup Ably avec prévention des doublons
  useEffect(() => {
    if (!sessionId || !currentUserId || !ablyClient || ablyLoading || !isAblyConnected) {
        console.log(`⏳ [ABLY SETUP] - Skipping setup, Ably not ready.`, { sessionId, currentUserId, ablyLoading, isAblyConnected });
        return;
    }
    
    if (channelRef.current) {
        console.log(`⚠️ [ABLY SETUP] - Channel already initialized, skipping.`);
        return;
    }
    
    console.log(`📡 [ABLY SETUP] - Initializing for session: ${sessionId}, user: ${currentUserId}`);
  
    const channelName = getSessionChannelName(sessionId);
    const channel = ablyClient.channels.get(channelName);
    channelRef.current = channel;

    const handleSessionEnded = () => {
        if (!isMountedRef.current) return;
        console.log('🛑 [SESSION END] - Session ended event received.');
        toast({ 
          title: 'Session terminée', 
          description: 'Le professeur a mis fin à la session.' 
        });
        router.push(currentUserRole === Role.PROFESSEUR ? '/teacher/dashboard' : '/student/dashboard');
    };

    const setupPresence = async () => {
        try {
            console.log('🔗 [PRESENCE] - Subscribing to presence events...');
            await channel.presence.subscribe(['enter', 'leave', 'update'], (member) => handlePresenceUpdateRef.current?.(member));
            
            const currentUserData = {
                name: currentUserRole === Role.PROFESSEUR ? teacherName : studentNames[currentUserId],
                role: currentUserRole,
            };
            
            console.log('✅ [PRESENCE] - Entering presence with data:', currentUserData);
            await channel.presence.enter(currentUserData);
            
            // Récupérer les membres initiaux
            setTimeout(() => {
                channel.presence.get((err, initialMembers) => {
                    if (!isMountedRef.current) return;
                    if (err) {
                        console.error('❌ [PRESENCE] - Error getting initial members:', err);
                        return;
                    }
                    
                    const initialMemberIds = Array.isArray(initialMembers) 
                        ? initialMembers.map((m: Types.PresenceMessage) => m.clientId).filter(Boolean)
                        : [];
                    
                    console.log('✅ [PRESENCE] - Initial presence set:', initialMemberIds);
                    setOnlineUserIds(initialMemberIds);
                });
            }, 1000);
        } catch (error) { 
            console.error("❌ [PRESENCE] - Presence setup failed:", error);
        }
    };

    const handleWhiteboardOperations = (message: Types.Message) => {
        if (!isMountedRef.current) return;
        const data = message.data;
        if (data.userId !== currentUserId && Array.isArray(data.operations)) {
            handleIncomingWhiteboardOperationsRef.current?.(data.operations);
        }
    };

    const handleDocumentShared = (message: Types.Message) => {
      if (!isMountedRef.current) return;

      // CORRECTION : Vérification d'existence avant ajout pour éviter la duplication
      setDocumentHistory(prev => {
        const newDocument = message.data;
        if (prev.some(doc => doc.id === newDocument.id)) {
          console.log(`📄 [DOCUMENT] - Document ${newDocument.id} already exists, skipping duplication`);
          return prev;
        }
        console.log(`📄 [DOCUMENT] - Adding new document to history: ${newDocument.id}`);
        return [...prev, newDocument];
      });

      setDocumentUrl(message.data.url);
      
      if (currentUserRole === Role.ELEVE) {
          setActiveTool('document');
          toast({ title: 'Document partagé', description: 'Le professeur a partagé un nouveau document.' });
      }
    };

    const bindEvents = () => {
        console.log('🔗 [EVENTS] - Binding Ably channel events...');
        channel.subscribe(AblyEvents.SIGNAL, (msg) => handleSignalRef.current?.(msg));
        channel.subscribe(AblyEvents.SESSION_ENDED, handleSessionEnded);
        channel.subscribe(AblyEvents.PARTICIPANT_SPOTLIGHTED, (msg) => {
          if (isMountedRef.current) {
            console.log(`🌟 [SPOTLIGHT] - Received spotlight for ${msg.data.participantId}`);
            setSpotlightedParticipantId(msg.data.participantId);
          }
        });
        channel.subscribe(AblyEvents.HAND_RAISE_UPDATE, (msg) => {
          if (isMountedRef.current) {
            setRaisedHands(prev => {
                const newSet = new Set(prev);
                msg.data.isRaised ? newSet.add(msg.data.userId) : newSet.delete(msg.data.userId);
                return newSet;
            });
          }
        });
        channel.subscribe(AblyEvents.UNDERSTANDING_UPDATE, (msg) => {
          if (isMountedRef.current) {
            setUnderstandingStatus(prev => new Map(prev).set(msg.data.userId, msg.data.status));
          }
        });
        channel.subscribe(AblyEvents.ACTIVE_TOOL_CHANGED, (msg) => {
          if (isMountedRef.current) {
            const validTools = ['camera', 'whiteboard', 'document', 'screen', 'chat', 'participants', 'quiz'];
            const validatedTool = validTools.includes(msg.data.tool) ? msg.data.tool : 'camera';
            setActiveTool(validatedTool);
          }
        });
        channel.subscribe(AblyEvents.DOCUMENT_SHARED, handleDocumentShared);
        channel.subscribe(AblyEvents.WHITEBOARD_CONTROLLER_UPDATE, (msg) => {
          if (isMountedRef.current) setWhiteboardControllerId(msg.data.controllerId);
        });
        channel.subscribe(AblyEvents.WHITEBOARD_OPERATION_BATCH, handleWhiteboardOperations);
        channel.subscribe(AblyEvents.TIMER_STARTED, () => {
          if (isMountedRef.current) setIsTimerRunning(true);
        });
        channel.subscribe(AblyEvents.TIMER_PAUSED, () => {
          if (isMountedRef.current) setIsTimerRunning(false);
        });
        channel.subscribe(AblyEvents.TIMER_RESET, (msg) => {
          if (isMountedRef.current) {
            const duration = validateTimerDuration(msg.data.duration);
            setIsTimerRunning(false);
            setTimerTimeLeft(duration);
            setTimerDuration(duration);
          }
        });
        console.log('✅ [EVENTS] - All Ably events bound.');
    };

    setupPresence();
    bindEvents();

    return () => {
      console.log(`🧹 [CLEANUP] - Cleaning up SessionClient for session: ${sessionId}`);
      
      // CORRECTION : Nettoyage complet de tous les peers
      Array.from(peersRef.current.keys()).forEach(cleanupPeerConnection);
      peersRef.current.clear();
      peerStatesRef.current.clear();
      
      if (channelRef.current) {
        try {
          console.log('🚪 [CLEANUP] - Leaving presence and unsubscribing from channel.');
          channelRef.current.presence.leave();
          channelRef.current.unsubscribe();
        } catch (error) {
          console.warn('⚠️ [CLEANUP] - Error during Ably channel cleanup:', error);
        }
        channelRef.current = null;
      }
    };
  }, [
    sessionId, currentUserId, ablyClient, ablyLoading, isAblyConnected,
    currentUserRole, teacherName, studentNames, router, toast, cleanupPeerConnection
  ]);
  
  // Gestion du minuteur
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (isTimerRunning && timerTimeLeft > 0) {
      intervalId = setInterval(() => {
        setTimerTimeLeft(prev => Math.max(0, prev - 1));
      }, 1000);
    } else if (timerTimeLeft === 0) {
        setIsTimerRunning(false);
    }
    return () => { 
      if (intervalId) clearInterval(intervalId); 
    };
  }, [isTimerRunning, timerTimeLeft]);

  const toggleMute = useCallback(() => { 
    if (!localStream) return;
    localStream.getAudioTracks().forEach(track => { track.enabled = !track.enabled; }); 
    setIsMuted(prev => !prev);
  }, [localStream]);

  const toggleVideo = useCallback(() => { 
    if (!localStream) return;
    localStream.getVideoTracks().forEach(track => { track.enabled = !track.enabled; }); 
    setIsVideoOff(prev => !prev);
  }, [localStream]);

  const onSpotlightParticipant = useCallback((participantId: string) => {
    if (currentUserRole !== Role.PROFESSEUR) return;
    ablyTrigger(getSessionChannelName(sessionId), AblyEvents.PARTICIPANT_SPOTLIGHTED, { participantId });
  }, [sessionId, currentUserRole]);
  
  const handleEndSession = useCallback(async () => {
    if (currentUserRole !== Role.PROFESSEUR) return;
    setIsEndingSession(true);
    try { 
      await endCoursSession(sessionId); 
    } catch (error) { 
      toast({ variant: 'destructive', title: 'Erreur' }); 
      setIsEndingSession(false); 
    }
  }, [currentUserRole, sessionId, toast]);

  const handleLeaveSession = useCallback(() => router.push(currentUserRole === Role.PROFESSEUR ? '/teacher/dashboard' : '/student/dashboard'), [router, currentUserRole]);
  
  const handleStartTimer = useCallback(() => { 
    setIsTimerRunning(true); 
    broadcastTimerEvent(sessionId, 'timer-started'); 
  }, [sessionId]);
  
  const handlePauseTimer = useCallback(() => { 
    setIsTimerRunning(false); 
    broadcastTimerEvent(sessionId, 'timer-paused'); 
  }, [sessionId]);
  
  const handleResetTimer = useCallback((newDuration?: number) => {
    const duration = validateTimerDuration(newDuration ?? timerDuration);
    setIsTimerRunning(false); 
    setTimerTimeLeft(duration); 
    setTimerDuration(duration);
    broadcastTimerEvent(sessionId, 'timer-reset', { duration });
  }, [sessionId, timerDuration]);
  
  const handleToggleHandRaise = useCallback((isRaised: boolean) => {
    setRaisedHands(prev => { 
      const newSet = new Set(prev); 
      isRaised ? newSet.add(currentUserId) : newSet.delete(currentUserId); 
      return newSet; 
    });
    updateStudentSessionStatus(sessionId, { isHandRaised: isRaised, understanding: understandingStatus.get(currentUserId) || ComprehensionLevel.NONE });
  }, [sessionId, currentUserId, understandingStatus]);
  
  const handleUnderstandingChange = useCallback((status: ComprehensionLevel) => {
    const newStatus = understandingStatus.get(currentUserId) === status ? ComprehensionLevel.NONE : status;
    setUnderstandingStatus(prev => new Map(prev).set(currentUserId, newStatus));
    updateStudentSessionStatus(sessionId, { understanding: newStatus, isHandRaised: raisedHands.has(currentUserId) });
  }, [sessionId, currentUserId, understandingStatus, raisedHands]);

  const onToolChange = useCallback((tool: string) => { 
    setActiveTool(tool); 
    if (currentUserRole === Role.PROFESSEUR) broadcastActiveTool(sessionId, tool); 
  }, [sessionId, currentUserRole]);
  
  const handleWhiteboardControllerChange = useCallback((userId: string) => {
    if (currentUserRole === Role.PROFESSEUR) {
      const newControllerId = userId === whiteboardControllerId ? initialTeacher?.id || null : userId;
      ablyTrigger(getSessionChannelName(sessionId), AblyEvents.WHITEBOARD_CONTROLLER_UPDATE, { controllerId: newControllerId });
    }
  }, [sessionId, currentUserRole, whiteboardControllerId, initialTeacher?.id]);

  const handleWhiteboardEvent = useCallback((ops: WhiteboardOperation[]) => sendOperation(ops), [sendOperation]);

  const spotlightedStream = useMemo(() => {
    if (!spotlightedParticipantId) return null;
    return spotlightedParticipantId === currentUserId ? (isSharingScreen ? screenStream : localStream) : remoteStreams.get(spotlightedParticipantId) || null;
  }, [spotlightedParticipantId, currentUserId, localStream, remoteStreams, isSharingScreen, screenStream]);
    
  const remoteParticipants = useMemo(() => Array.from(remoteStreams.entries()).map(([id, stream]) => ({ id, stream })), [remoteStreams]);
    
  const spotlightedUser = useMemo(() => [initialTeacher, ...initialStudents].find(u => u?.id === spotlightedParticipantId), [initialTeacher, initialStudents, spotlightedParticipantId]);

  const isComponentLoading = loading || ablyLoading || (!isAblyConnected && !!ablyClient);
  
  const handleSelectDocument = useCallback((doc: DocumentInHistory) => {
    setDocumentUrl(doc.url);
    if (currentUserRole === Role.PROFESSEUR) {
        onToolChange('document');
    }
  }, [currentUserRole, onToolChange]);

  const onDocumentShared = (doc: DocumentInHistory) => {
    // CORRECTION : Vérification d'existence avant ajout pour éviter la duplication
    setDocumentHistory(prev => {
      if (prev.some(d => d.id === doc.id)) {
        console.log(`📄 [DOCUMENT] - Document ${doc.id} already exists in history, skipping duplication`);
        return prev;
      }
      console.log(`📄 [DOCUMENT] - Adding shared document to history: ${doc.id}`);
      return [...prev, doc];
    });
    setDocumentUrl(doc.url);
    onToolChange('document');
  };

  if (isComponentLoading) {
    return <SessionLoading />;
  }
  
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
            allSessionUsers={[initialTeacher, ...initialStudents].filter(Boolean) as SessionParticipant[]}
            onlineUserIds={onlineUserIds} 
            onSpotlightParticipant={onSpotlightParticipant} 
            raisedHands={raisedHands}
            understandingStatus={understandingStatus} 
            currentUserId={currentUserId} 
            onScreenShare={toggleScreenShare}
            isSharingScreen={isSharingScreen} 
            activeTool={activeTool} 
            onToolChange={onToolChange}
            classroom={classroom} 
            documentUrl={documentUrl} 
            onSelectDocument={handleSelectDocument}
            whiteboardControllerId={whiteboardControllerId} 
            onWhiteboardControllerChange={handleWhiteboardControllerChange}
            initialDuration={timerDuration} 
            timerTimeLeft={timerTimeLeft} 
            isTimerRunning={isTimerRunning}
            onStartTimer={handleStartTimer} 
            onPauseTimer={handlePauseTimer} 
            onResetTimer={handleResetTimer}
            onWhiteboardEvent={handleWhiteboardEvent} 
            whiteboardOperations={whiteboardOperations} 
            flushWhiteboardOperations={flushOperations}
            documentHistory={documentHistory}
            onDocumentShared={onDocumentShared}
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
            whiteboardControllerId={whiteboardControllerId} 
            timerTimeLeft={timerTimeLeft}
            onWhiteboardEvent={handleWhiteboardEvent} 
            whiteboardOperations={whiteboardOperations} 
            flushWhiteboardOperations={flushOperations}
            onlineMembersCount={onlineUserIds.length} 
            isPresenceConnected={isAblyConnected}
          />
        )}
      </main>
    </div>
  );
}