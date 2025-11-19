// src/components/SessionClient.tsx - VERSION COMPLÈTE CORRIGÉE
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Instance as PeerInstance, SignalData as PeerSignalData } from 'simple-peer';
import SimplePeer from 'simple-peer';
import { useToast } from '@/hooks/use-toast';
import { User, Role } from '@prisma/client';
import type { SessionClientProps, IncomingSignalData, SignalPayload, SessionParticipant, DocumentInHistory, WhiteboardOperation, Quiz, QuizResponse, QuizResults } from '@/types';
import SessionLoading from './SessionLoading';
import { SessionHeader } from './session/SessionHeader';
import { PermissionPrompt } from './PermissionPrompt';
import { endCoursSession, shareDocumentToStudents, saveAndShareDocument } from '@/lib/actions/session.actions';
import { ComprehensionLevel } from '@/types';
import { useAbly } from '@/hooks/useAbly';
import Ably, { type Types } from 'ably';
import { getSessionChannelName } from '@/lib/ably/channels';
import { AblyEvents } from '@/lib/ably/events';
import { ablyTrigger } from '@/lib/ably/triggers';
import { updateStudentSessionStatus, broadcastActiveTool, broadcastTimerEvent, startQuiz, submitQuizResponse, endQuiz } from '@/lib/actions/ably-session.actions';

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

// Interface pour l'état des peers
interface PeerState {
    isConnected: boolean;
    isConnecting: boolean;
    connectionAttempts: number;
    lastAttempt: number;
    signalCount: number;
    hasReceivedStream: boolean;
}

// CONFIGURATION WEBRTC OPTIMISÉE POUR LA STABILITÉ
const WEBRTC_CONFIG = {
    MAX_SIGNALS: 25,
    CONNECTION_TIMEOUT: 30000,
    RETRY_DELAY: 10000,
    MAX_CONNECTION_ATTEMPTS: 3,
    
    // Configuration ICE optimisée
    ICE_SERVERS: [
        // Serveurs STUN gratuits
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        
        // Serveurs TURN gratuits avec authentification
        { 
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        { 
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        { 
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        }
    ]
};

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
  const setupCompletedRef = useRef(false);
  
  // Utiliser le hook useAbly existant avec gestion d'état améliorée
  const { client: ablyClient, isConnected: isAblyConnected, connectionState } = useAbly();
  const ablyLoading = connectionState === 'initialized' || connectionState === 'connecting';  
  
  // État de session prête
  const [sessionReady, setSessionReady] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isSharingScreen, setIsSharingScreen] = useState<boolean>(false);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [spotlightedParticipantId, setSpotlightedParticipantId] = useState<string | null>(initialTeacher?.id || null);
  const [isMediaReady, setIsMediaReady] = useState(false);

  // Vérifier que la session est prête
  useEffect(() => {
    if (ablyClient && isAblyConnected && sessionId) {
      console.log(`🎯 [SESSION READY] - Session ${sessionId} ready for user ${currentUserId}`);
      setSessionReady(true);
    } else {
      setSessionReady(false);
    }
  }, [ablyClient, isAblyConnected, sessionId, currentUserId]);

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

  // Nouveaux états pour le quiz
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(initialActiveQuiz);
  const [quizResponses, setQuizResponses] = useState<Map<string, QuizResponse>>(new Map());
  const [quizResults, setQuizResults] = useState<QuizResults | null>(null);
  
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
  const peerStatesRef = useRef<Map<string, PeerState>>(new Map());
  const channelRef = useRef<Ably.Types.RealtimeChannelCallbacks | null>(null);
  const mediaCleanupRef = useRef<(() => void) | null>(null);

  // Référence pour suivre les connexions en cours
  const pendingConnectionsRef = useRef<Set<string>>(new Set());

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
  
  // FONCTION DE NETTOYAGE DES PEERS AMÉLIORÉE
  const cleanupPeerConnection = useCallback((userId: string): void => {
    // Retirer des connexions en cours
    pendingConnectionsRef.current.delete(userId);
    
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

  // FONCTION DE CRÉATION DE PEER COMPLÈTEMENT RÉÉCRITE POUR LA STABILITÉ
  const createPeer = useCallback((targetUserId: string, initiator: boolean, stream: MediaStream | null): PeerInstance | undefined => {
    if (!isMountedRef.current) {
        console.warn(`⚠️ [PEER CREATION] - Component unmounted, skipping peer creation for: ${targetUserId}`);
        return undefined;
    }

    // Vérification plus stricte des connexions existantes
    const existingState = peerStatesRef.current.get(targetUserId);
    if (existingState?.isConnected) {
        console.log(`🔗 [PEER SKIP] - Already connected to ${targetUserId}, skipping new peer creation`);
        return undefined;
    }

    // Empêcher les connexions en double
    if (pendingConnectionsRef.current.has(targetUserId)) {
        console.log(`⏳ [PEER BUSY] - Connection already pending for ${targetUserId}, skipping`);
        return undefined;
    }

    const now = Date.now();
    const MAX_ATTEMPTS = WEBRTC_CONFIG.MAX_CONNECTION_ATTEMPTS;
    const RETRY_DELAY = WEBRTC_CONFIG.RETRY_DELAY;

    if (existingState) {
        if (existingState.connectionAttempts >= MAX_ATTEMPTS && 
            now - existingState.lastAttempt < RETRY_DELAY) {
            console.warn(`🛑 [PEER LIMIT] - Too many connection attempts for ${targetUserId}, waiting...`);
            return undefined;
        }
        
        if (existingState.isConnecting) {
            console.log(`⏳ [PEER BUSY] - Peer for ${targetUserId} is already connecting, skipping`);
            return undefined;
        }
    }

    const existingPeer = peersRef.current.get(targetUserId);
    if (existingPeer && !existingPeer.destroyed) {
        console.log(`🔁 [PEER REUSE] - Reusing existing peer for: ${targetUserId}`);
        return existingPeer;
    }

    console.log(`🤝 [PEER CREATION] - Creating peer for target: ${targetUserId}. Initiator: ${initiator}, Has stream: ${!!stream}`);

    try {
        // Marquer comme connexion en cours
        pendingConnectionsRef.current.add(targetUserId);
        
        peerStatesRef.current.set(targetUserId, { 
            isConnected: false, 
            isConnecting: true,
            connectionAttempts: (existingState?.connectionAttempts || 0) + 1,
            lastAttempt: now,
            signalCount: 0,
            hasReceivedStream: false
        });

        // CORRECTION CRITIQUE : Configuration SimplePeer optimisée
        const peer = new SimplePeer({
            initiator,
            trickle: true,
            stream: stream || undefined,
            config: {
                iceServers: WEBRTC_CONFIG.ICE_SERVERS,
                iceCandidatePoolSize: 10,
                iceTransportPolicy: 'all',
                rtcpMuxPolicy: 'require',
                bundlePolicy: 'max-compat'
            },
            offerOptions: {
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
                iceRestart: false
            },
            answerOptions: {
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            }
        });

        let connectionTimeout: NodeJS.Timeout;
        let iceGatheringTimeout: NodeJS.Timeout;
        
        let localSignalCount = 0;
        const processedCandidates = new Set<string>();
        let shouldStopSignaling = false;

        // CORRECTION : Gestion améliorée des signaux
        peer.on('signal', (signal: PeerSignalData) => {
            if (!isMountedRef.current || peer.destroyed || shouldStopSignaling) return;
            
            localSignalCount++;
            
            // Arrêt plus précoce des signaux
            if (localSignalCount > WEBRTC_CONFIG.MAX_SIGNALS) {
                console.warn(`🛑 [SIGNAL LIMIT] - Too many signals for ${targetUserId} (${localSignalCount}), stopping further signals`);
                shouldStopSignaling = true;
                return;
            }
            
            if (signal.type === 'candidate') {
                const candidateKey = JSON.stringify(signal);
                if (processedCandidates.has(candidateKey)) {
                    console.log(`🔄 [ICE FILTER] - Skipping duplicate ICE candidate for ${targetUserId}`);
                    return;
                }
                processedCandidates.add(candidateKey);
            }
            
            console.log(`📡 [PEER SIGNAL] - Sending signal ${localSignalCount}/${WEBRTC_CONFIG.MAX_SIGNALS} from ${currentUserId} to ${targetUserId} (type: ${signal.type})`);
            
            const delay = signal.type === 'candidate' ? 
                Math.min(localSignalCount * 50, 500) : 0;
            
            setTimeout(() => {
                if (isMountedRef.current && !peer.destroyed && !shouldStopSignaling) {
                    signalViaAPI({
                        channelName: getSessionChannelName(sessionId),
                        userId: currentUserId,
                        target: targetUserId,
                        signal,
                        isReturnSignal: !initiator
                    });
                }
            }, delay);
        });

        // CORRECTION CRITIQUE : Gestion du stream avec validation
        peer.on('stream', (remoteStream: MediaStream) => {
            if (!isMountedRef.current) return;
            
            console.log(`🎉 ✅ [PEER STREAM] - SUCCESS: Received stream from ${targetUserId} after ${localSignalCount} signals`);
            
            // Vérifier que le stream est valide
            const videoTracks = remoteStream.getVideoTracks();
            const audioTracks = remoteStream.getAudioTracks();
            
            if (videoTracks.length > 0 || audioTracks.length > 0) {
                setRemoteStreams(prev => {
                    const newMap = new Map(prev);
                    newMap.set(targetUserId, remoteStream);
                    return newMap;
                });
                
                // MARQUER COMME CONNECTÉ ET AVEC STREAM
                peerStatesRef.current.set(targetUserId, { 
                    isConnected: true, 
                    isConnecting: false,
                    connectionAttempts: 0,
                    lastAttempt: Date.now(),
                    signalCount: localSignalCount,
                    hasReceivedStream: true
                });
                
                // Retirer des connexions en cours
                pendingConnectionsRef.current.delete(targetUserId);
                
                clearTimeout(connectionTimeout);
                clearTimeout(iceGatheringTimeout);
                
                console.log(`🏁 [CONNECTION STABLE] - Connection with ${targetUserId} is now stable with valid stream`);
            } else {
                console.warn(`⚠️ [PEER STREAM] - No valid tracks in stream from ${targetUserId}`);
            }
        });

        // CORRECTION : Gestion de l'événement 'connect' pour confirmer la connexion
        peer.on('connect', () => {
            console.log(`🔗 [PEER CONNECT] - Peer connection established with ${targetUserId}`);
            
            peerStatesRef.current.set(targetUserId, { 
                isConnected: true, 
                isConnecting: false,
                connectionAttempts: 0,
                lastAttempt: Date.now(),
                signalCount: localSignalCount,
                hasReceivedStream: peerStatesRef.current.get(targetUserId)?.hasReceivedStream || false
            });
            
            // Retirer des connexions en cours
            pendingConnectionsRef.current.delete(targetUserId);
            
            clearTimeout(connectionTimeout);
            clearTimeout(iceGatheringTimeout);
        });

        // CORRECTION CRITIQUE : Gestion d'erreur améliorée
        peer.on('error', (err: Error) => {
            console.error(`❌ [PEER ERROR] - Peer error with ${targetUserId} after ${localSignalCount} signals:`, err);
            
            // Ne pas nettoyer immédiatement si on a déjà reçu un stream
            const currentState = peerStatesRef.current.get(targetUserId);
            const hasStream = currentState?.hasReceivedStream;
            
            if (hasStream) {
                console.log(`🔄 [STREAM RECOVERY] - Connection error but stream exists for ${targetUserId}, attempting recovery`);
                // Garder la connexion et tenter une récupération
                peerStatesRef.current.set(targetUserId, { 
                    isConnected: true, // Garder comme connecté car le stream existe
                    isConnecting: false,
                    connectionAttempts: currentState?.connectionAttempts || 1,
                    lastAttempt: Date.now(),
                    signalCount: localSignalCount,
                    hasReceivedStream: true
                });
            } else {
                // Pour les connexions sans stream, nettoyer
                peerStatesRef.current.set(targetUserId, { 
                    isConnected: false, 
                    isConnecting: false,
                    connectionAttempts: currentState?.connectionAttempts || 1,
                    lastAttempt: Date.now(),
                    signalCount: localSignalCount,
                    hasReceivedStream: false
                });
                
                // Nettoyer seulement si pas de stream
                setTimeout(() => {
                    if (isMountedRef.current && !peerStatesRef.current.get(targetUserId)?.hasReceivedStream) {
                        console.log(`🧹 [PEER CLEANUP] - Cleaning up failed peer for ${targetUserId} after error`);
                        cleanupPeerConnection(targetUserId);
                    }
                }, 3000);
            }
            
            pendingConnectionsRef.current.delete(targetUserId);
            clearTimeout(connectionTimeout);
            clearTimeout(iceGatheringTimeout);
        });
        
        peer.on('close', () => {
            console.log(`🚪 [PEER CLOSE] - Peer connection closed for ${targetUserId} after ${localSignalCount} signals`);
            
            const currentState = peerStatesRef.current.get(targetUserId);
            // Ne marquer comme déconnecté que si on n'a pas de stream
            if (!currentState?.hasReceivedStream) {
                peerStatesRef.current.set(targetUserId, { 
                    isConnected: false, 
                    isConnecting: false,
                    connectionAttempts: 0,
                    lastAttempt: Date.now(),
                    signalCount: localSignalCount,
                    hasReceivedStream: false
                });
            }
            
            pendingConnectionsRef.current.delete(targetUserId);
            clearTimeout(connectionTimeout);
            clearTimeout(iceGatheringTimeout);
        });

        iceGatheringTimeout = setTimeout(() => {
            if (isMountedRef.current && localSignalCount > 8) {
                console.log(`⏰ [ICE GATHERING TIMEOUT] - Stopping ICE gathering for ${targetUserId} after ${localSignalCount} signals`);
                shouldStopSignaling = true;
            }
        }, 10000);

        connectionTimeout = setTimeout(() => {
            if (isMountedRef.current && !peerStatesRef.current.get(targetUserId)?.isConnected) {
                console.warn(`⏰ [PEER TIMEOUT] - Connection timeout for ${targetUserId} after ${localSignalCount} signals`);
                const currentState = peerStatesRef.current.get(targetUserId);
                
                // Ne nettoyer que si pas de stream reçu
                if (!currentState?.hasReceivedStream) {
                    peerStatesRef.current.set(targetUserId, { 
                        isConnected: false, 
                        isConnecting: false,
                        connectionAttempts: currentState?.connectionAttempts || 1,
                        lastAttempt: Date.now(),
                        signalCount: localSignalCount,
                        hasReceivedStream: false
                    });
                    
                    cleanupPeerConnection(targetUserId);
                }
            }
        }, WEBRTC_CONFIG.CONNECTION_TIMEOUT);
        
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
        
        // Nettoyer en cas d'erreur
        pendingConnectionsRef.current.delete(targetUserId);
        
        peerStatesRef.current.set(targetUserId, { 
            isConnected: false, 
            isConnecting: false,
            connectionAttempts: (existingState?.connectionAttempts || 0) + 1,
            lastAttempt: Date.now(),
            signalCount: 0,
            hasReceivedStream: false
        });
        return undefined;
    }
}, [sessionId, currentUserId, cleanupPeerConnection]);

  // Initialisation des médias
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
      
      // Nettoyage complet de tous les peers et connexions en cours
      Array.from(peersRef.current.keys()).forEach(userId => {
          cleanupPeerConnection(userId);
      });
      
      // Nettoyer toutes les connexions en cours
      pendingConnectionsRef.current.clear();
      
      mediaCleanupRef.current?.();
      console.log(`🧹 [LIFECYCLE] - UNMOUNT SessionClient for session: ${sessionId}`);
    };
  }, [sessionId, currentUserId, cleanupPeerConnection, screenStream]);

  // Gestion du partage d'écran
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

  // Partage d'écran
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
        
        // Mise à jour des peers avec gestion d'erreur
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

  // Logique d'initiation centralisée et synchronisée
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
          
          // Dédoublonnage
          const uniqueMembers = members.reduce((acc, member) => {
            if (member.clientId && !acc.includes(member.clientId)) {
              acc.push(member.clientId);
            }
            return acc;
          }, [] as string[]);
          
          console.log(`📊 [PRESENCE] - Online members (deduplicated):`, uniqueMembers);
          setOnlineUserIds(uniqueMembers);
          
          const otherUserIds = uniqueMembers.filter((id: string) => id !== currentUserId);
          
          // LOGIQUE D'INITIATION CENTRALISÉE
          // SEUL LE PROFESSEUR INITIE LES CONNEXIONS
          if (currentUserRole === Role.PROFESSEUR && isMediaReady && sessionReady) {
              console.log(`🎯 [PROFESSOR INITIATION] - Professor ready to initiate connections to ${otherUserIds.length} users`);
              
              otherUserIds.forEach((userId: string) => {
                  // VÉRIFICATIONS MULTIPLES POUR ÉVITER LES CONFLITS
                  const existingState = peerStatesRef.current.get(userId);
                  const isPending = pendingConnectionsRef.current.has(userId);
                  
                  // Éviter les connexions en double
                  if (existingState?.isConnected) {
                      console.log(`🔗 [PRESENCE] - Already connected to ${userId}, skipping`);
                      return;
                  }
                  
                  if (isPending) {
                      console.log(`⏳ [PRESENCE] - Connection already pending for ${userId}, skipping`);
                      return;
                  }
                  
                  // Réduire les restrictions de reconnexion
                  const now = Date.now();
                  const MIN_RETRY_DELAY = WEBRTC_CONFIG.RETRY_DELAY;
                  
                  if (existingState && 
                      existingState.connectionAttempts >= WEBRTC_CONFIG.MAX_CONNECTION_ATTEMPTS && 
                      now - existingState.lastAttempt < MIN_RETRY_DELAY) {
                      console.log(`⏳ [PEER DELAY] - Max attempts reached for ${userId}, waiting...`);
                      return;
                  }
                  
                  console.log(`🎯 [PEER CREATE PRESENCE] - Professor ${currentUserId} initiating connection to ${userId}`);
                  const streamToUse = isSharingScreen ? screenStream : localStream;
                  createPeer(userId, true, streamToUse);
              });
          } else if (currentUserRole === Role.ELEVE) {
              console.log(`⏳ [PRESENCE] - Student ${currentUserId} waiting for professor to initiate connections (mediaReady: ${isMediaReady}, sessionReady: ${sessionReady})`);
          }

          // Nettoyer les utilisateurs déconnectés
          const currentPeerUserIds = Array.from(peersRef.current.keys());
          const offlineUserIds = currentPeerUserIds.filter(id => !uniqueMembers.includes(id));
          
          offlineUserIds.forEach(userId => {
              console.log(`🧹 [PRESENCE CLEANUP] - User ${userId} offline, cleaning up peer.`);
              cleanupPeerConnection(userId);
          });
      });
    };
  }, [currentUserId, isMediaReady, isSharingScreen, screenStream, localStream, createPeer, cleanupPeerConnection, currentUserRole, sessionReady]);

  // Ajouter un effet pour forcer l'initiation quand l'élève arrive
  useEffect(() => {
    if (currentUserRole === Role.PROFESSEUR && isMediaReady && sessionReady && onlineUserIds.length > 1) {
      // Vérifier s'il y a des élèves en ligne sans connexion
      const studentsWithoutConnection = onlineUserIds.filter(userId => 
        userId !== currentUserId && 
        !peerStatesRef.current.get(userId)?.isConnected &&
        !pendingConnectionsRef.current.has(userId)
      );
      
      if (studentsWithoutConnection.length > 0) {
        console.log(`🎯 [FORCE INITIATION] - Professor initiating connections to ${studentsWithoutConnection.length} students without connection`);
        
        studentsWithoutConnection.forEach(userId => {
          const existingState = peerStatesRef.current.get(userId);
          const now = Date.now();
          const MIN_RETRY_DELAY = WEBRTC_CONFIG.RETRY_DELAY;
          
          if (existingState && 
              existingState.connectionAttempts >= WEBRTC_CONFIG.MAX_CONNECTION_ATTEMPTS && 
              now - existingState.lastAttempt < MIN_RETRY_DELAY) {
              return; // Skip si trop de tentatives récentes
          }
          
          console.log(`🔄 [FORCE PEER CREATE] - Creating peer for ${userId}`);
          const streamToUse = isSharingScreen ? screenStream : localStream;
          createPeer(userId, true, streamToUse);
        });
      }
    }
  }, [onlineUserIds, currentUserRole, isMediaReady, sessionReady, isSharingScreen, screenStream, localStream, createPeer, currentUserId]);

  // Gestion des signaux
  useEffect(() => {
    handleSignalRef.current = (message: Types.Message) => {
        if (!isMountedRef.current) return;
        
        const data = message.data as IncomingSignalData;
        if (data.target !== currentUserId) return;
        
        console.log(`🔔 [SIGNAL] - Received signal from ${data.userId} for ${data.target} (type: ${data.signal?.type})`);
        
        const peerState = peerStatesRef.current.get(data.userId);
        
        // Vérification améliorée de l'état de connexion
        if (peerState?.isConnected) {
            console.log(`🔗 [SIGNAL SKIP] - Already connected to ${data.userId}, ignoring signal`);
            return;
        }
        
        let peer = peersRef.current.get(data.userId);
        
        // Logique de création de peer améliorée pour éviter les conflits
        if (!peer || peer.destroyed) {
            console.log(`⚠️ [SIGNAL] - No valid peer found for ${data.userId}, creating new peer.`);
            const streamToUse = isSharingScreen ? screenStream : localStream;
            peer = createPeer(data.userId, false, streamToUse);
            
            // Attendre que le peer soit prêt avant de traiter le signal
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
            // Peer existant - traiter le signal immédiatement
            try {
                peer.signal(data.signal);
            } catch (error) {
                console.error(`❌ [SIGNAL] - Error signaling existing peer ${data.userId}:`, error);
            }
        }
    };
  }, [currentUserId, isSharingScreen, screenStream, localStream, createPeer]);
  
  const handleSessionEnded = useCallback(() => {
    if (!isMountedRef.current) return;
    console.log('🛑 [SESSION END] - Session ended event received.');
    toast({ 
      title: 'Session terminée', 
      description: 'Le professeur a mis fin à la session.' 
    });
    router.push(currentUserRole === Role.PROFESSEUR ? '/teacher/dashboard' : '/student/dashboard');
  }, [router, currentUserRole, toast]);

  const handleSpotlight = useCallback((message: Types.Message) => {
    if (isMountedRef.current) {
      console.log(`🌟 [SPOTLIGHT] - Received spotlight for ${message.data.participantId}`);
      setSpotlightedParticipantId(message.data.participantId);
    }
  }, []);

  const handleHandRaiseUpdate = useCallback((message: Types.Message) => {
    if (isMountedRef.current) {
      setRaisedHands(prev => {
          const newSet = new Set(prev);
          message.data.isRaised ? newSet.add(message.data.userId) : newSet.delete(message.data.userId);
          return newSet;
      });
    }
  }, []);

  const handleUnderstandingUpdate = useCallback((message: Types.Message) => {
    if (isMountedRef.current) {
      setUnderstandingStatus(prev => new Map(prev).set(message.data.userId, message.data.status));
    }
  }, []);

  const handleActiveToolChange = useCallback((message: Types.Message) => {
    if (isMountedRef.current) {
      const validTools = ['camera', 'whiteboard', 'document', 'screen', 'chat', 'participants', 'quiz'];
      const validatedTool = validTools.includes(message.data.tool) ? message.data.tool : 'camera';
      setActiveTool(validatedTool);
    }
  }, []);

  const handleDocumentShared = useCallback((message: Types.Message) => {
    if (!isMountedRef.current) return;
    const data = message.data;
    if (data.sharedByUserId === currentUserId) return;
    
    setDocumentHistory(prev => {
      const newDocument: DocumentInHistory = {
        id: data.id,
        name: data.name,
        url: data.url,
        createdAt: data.createdAt,
        sharedBy: data.sharedBy,
        coursSessionId: data.coursSessionId,
      };
      if (prev.some(doc => doc.id === newDocument.id)) return prev;
      return [...prev, newDocument];
    });
    setDocumentUrl(data.url);
    if (currentUserRole === Role.ELEVE) {
      setActiveTool('document');
      toast({ title: 'Document partagé', description: `${data.sharedBy} a partagé un nouveau document.` });
    }
  }, [currentUserId, currentUserRole, toast]);

  const handleDocumentDeleted = useCallback((message: Types.Message) => {
    if (!isMountedRef.current) return;
    const { documentId, deletedBy } = message.data;
    setDocumentHistory(prev => prev.filter(doc => doc.id !== documentId));
    if (deletedBy !== currentUserId) {
        toast({ title: 'Document supprimé' });
    }
  }, [currentUserId, toast]);

  const handleWhiteboardControllerUpdate = useCallback((message: Types.Message) => {
    if (isMountedRef.current) setWhiteboardControllerId(message.data.controllerId);
  }, []);

  const handleWhiteboardOperations = useCallback((message: Types.Message) => {
    if (!isMountedRef.current) return;
    const data = message.data;
    if (data.userId !== currentUserId && Array.isArray(data.operations)) {
        handleIncomingWhiteboardOperationsRef.current?.(data.operations);
    }
  }, [currentUserId]);

  const handleTimerStarted = useCallback(() => {
    if (isMountedRef.current) setIsTimerRunning(true);
  }, []);

  const handleTimerPaused = useCallback(() => {
    if (isMountedRef.current) setIsTimerRunning(false);
  }, []);

  const handleTimerReset = useCallback((message: Types.Message) => {
    if (isMountedRef.current) {
      const duration = validateTimerDuration(message.data.duration);
      setIsTimerRunning(false);
      setTimerTimeLeft(duration);
      setTimerDuration(duration);
    }
  }, []);

  const handleQuizStarted = useCallback((message: Types.Message) => {
    if (isMountedRef.current) {
        setActiveQuiz(message.data.quiz);
        setQuizResults(null);
        setQuizResponses(new Map());
    }
  }, []);

  const handleQuizResponse = useCallback((message: Types.Message) => {
    if (isMountedRef.current) {
        setQuizResponses(prev => new Map(prev).set(message.data.userId, message.data.response));
    }
  }, []);

  const handleQuizEnded = useCallback((message: Types.Message) => {
    if (isMountedRef.current) {
        setActiveQuiz(null);
        setQuizResults(message.data.results);
    }
  }, []);

  // Setup Ably complet
  useEffect(() => {
    if (!sessionId || !currentUserId || !ablyClient || ablyLoading || !sessionReady) {
        console.log(`⏳ [ABLY SETUP] - Skipping setup, Ably not ready.`, { 
          sessionId, 
          currentUserId, 
          ablyLoading, 
          isAblyConnected, 
          sessionReady 
        });
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

    const bindEvents = () => {
        console.log('🔗 [EVENTS] - Binding Ably channel events...');
        channel.subscribe(AblyEvents.SIGNAL, (msg) => handleSignalRef.current?.(msg));
        channel.subscribe(AblyEvents.SESSION_ENDED, handleSessionEnded);
        channel.subscribe(AblyEvents.PARTICIPANT_SPOTLIGHTED, handleSpotlight);
        channel.subscribe(AblyEvents.HAND_RAISE_UPDATE, handleHandRaiseUpdate);
        channel.subscribe(AblyEvents.UNDERSTANDING_UPDATE, handleUnderstandingUpdate);
        channel.subscribe(AblyEvents.ACTIVE_TOOL_CHANGED, handleActiveToolChange);
        channel.subscribe(AblyEvents.DOCUMENT_SHARED, handleDocumentShared);
        channel.subscribe(AblyEvents.DOCUMENT_DELETED, handleDocumentDeleted);
        channel.subscribe(AblyEvents.WHITEBOARD_CONTROLLER_UPDATE, handleWhiteboardControllerUpdate);
        channel.subscribe(AblyEvents.WHITEBOARD_OPERATION_BATCH, handleWhiteboardOperations);
        channel.subscribe(AblyEvents.TIMER_STARTED, handleTimerStarted);
        channel.subscribe(AblyEvents.TIMER_PAUSED, handleTimerPaused);
        channel.subscribe(AblyEvents.TIMER_RESET, handleTimerReset);
        channel.subscribe(AblyEvents.QUIZ_STARTED, handleQuizStarted);
        channel.subscribe(AblyEvents.QUIZ_RESPONSE, handleQuizResponse);
        channel.subscribe(AblyEvents.QUIZ_ENDED, handleQuizEnded);
        console.log('✅ [EVENTS] - All Ably events bound.');
    };

    setupPresence();
    bindEvents();

    return () => {
      console.log(`🧹 [CLEANUP] - Cleaning up SessionClient for session: ${sessionId}`);
      
      // Nettoyage complet de tous les peers
      Array.from(peersRef.current.keys()).forEach(cleanupPeerConnection);
      peersRef.current.clear();
      peerStatesRef.current.clear();
      pendingConnectionsRef.current.clear();
      
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
    sessionId, currentUserId, ablyClient, ablyLoading, sessionReady,
    currentUserRole, teacherName, studentNames, router, toast, cleanupPeerConnection,
    handleSessionEnded, handleSpotlight, handleHandRaiseUpdate, handleUnderstandingUpdate,
    handleActiveToolChange, handleDocumentShared, handleDocumentDeleted,
    handleWhiteboardControllerUpdate, handleWhiteboardOperations, handleTimerStarted,
    handleTimerPaused, handleTimerReset, handleQuizStarted, handleQuizResponse, handleQuizEnded
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

  // Contrôles audio/vidéo
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

  // Gestion des participants
  const onSpotlightParticipant = useCallback(async (participantId: string) => {
    if (currentUserRole !== Role.PROFESSEUR) return;
    await ablyTrigger(getSessionChannelName(sessionId), AblyEvents.PARTICIPANT_SPOTLIGHTED, { participantId });
  }, [sessionId, currentUserRole]);
  
  // Fin de session
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
  
  const handleToggleHandRaise = useCallback(async (isRaised: boolean) => {
    await updateStudentSessionStatus(sessionId, { isHandRaised: isRaised });
  }, [sessionId]);

  const handleUnderstandingChange = useCallback(async (status: ComprehensionLevel) => {
    await updateStudentSessionStatus(sessionId, { understanding: status });
  }, [sessionId]);

  const onToolChange = useCallback(async (tool: string) => {
    await broadcastActiveTool(sessionId, tool);
  }, [sessionId]);
  
  // Tableau blanc
  const handleWhiteboardControllerChange = useCallback(async (userId: string) => {
    if (currentUserRole === Role.PROFESSEUR) {
      const newControllerId = userId === whiteboardControllerId ? initialTeacher?.id || null : userId;
      await ablyTrigger(getSessionChannelName(sessionId), AblyEvents.WHITEBOARD_CONTROLLER_UPDATE, { controllerId: newControllerId });
    }
  }, [sessionId, currentUserRole, whiteboardControllerId, initialTeacher?.id]);

  const handleWhiteboardEvent = useCallback((ops: WhiteboardOperation[]) => sendOperation(ops), [sendOperation]);

  // Calculs des streams
  const spotlightedStream = useMemo(() => {
    if (!spotlightedParticipantId) return null;
    return spotlightedParticipantId === currentUserId ? (isSharingScreen ? screenStream : localStream) : remoteStreams.get(spotlightedParticipantId) || null;
  }, [spotlightedParticipantId, currentUserId, localStream, remoteStreams, isSharingScreen, screenStream]);
    
  const remoteParticipants = useMemo(() => Array.from(remoteStreams.entries()).map(([id, stream]) => ({ id, stream })), [remoteStreams]);
    
  const spotlightedUser = useMemo(() => [initialTeacher, ...initialStudents].find(u => u?.id === spotlightedParticipantId), [initialTeacher, initialStudents, spotlightedParticipantId]);

  const isComponentLoading = loading || ablyLoading || (!isAblyConnected && !!ablyClient);
  
  // Documents
  const handleSelectDocument = useCallback((doc: DocumentInHistory) => {
    setDocumentUrl(doc.url);
    if (currentUserRole === Role.PROFESSEUR) {
        onToolChange('document');
    }
  }, [currentUserRole, onToolChange]);

  const handleUploadSuccess = useCallback(async (uploadedDoc: { name: string; url: string }) => {
    if (!uploadedDoc.name || !uploadedDoc.url) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Données du document invalides' });
      return;
    }
    try {
      const { document } = await saveAndShareDocument(sessionId, uploadedDoc);
      toast({ title: 'Document partagé !', description: 'Le document a été partagé avec tous les participants.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de partager le document' });
    }
  }, [sessionId, toast]);

  if (isComponentLoading) {
    return <SessionLoading />;
  }

  const isHandRaised = raisedHands.has(currentUserId);
  
  // RENDU COMPLET
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
            initialDuration={initialDuration || INITIAL_TIMER_DURATION}
            timerTimeLeft={timerTimeLeft} 
            isTimerRunning={isTimerRunning}
            onStartTimer={() => broadcastTimerEvent(sessionId, 'timer-started')}
            onPauseTimer={() => broadcastTimerEvent(sessionId, 'timer-paused')}
            onResetTimer={(duration) => broadcastTimerEvent(sessionId, 'timer-reset', { duration })}
            onWhiteboardEvent={handleWhiteboardEvent} 
            whiteboardOperations={whiteboardOperations} 
            flushWhiteboardOperations={flushOperations}
            documentHistory={documentHistory}
            onDocumentShared={handleUploadSuccess}
            activeQuiz={activeQuiz}
            quizResponses={quizResponses}
            quizResults={quizResults}
            onStartQuiz={(quiz) => startQuiz(sessionId, quiz)}
            onEndQuiz={(quizId) => endQuiz(sessionId, quizId)}
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
            onWhiteboardEvent={handleWhiteboardEvent} 
            whiteboardOperations={whiteboardOperations} 
            flushWhiteboardOperations={flushOperations}
            onlineMembersCount={onlineUserIds.length} 
            isPresenceConnected={isAblyConnected}
            activeQuiz={activeQuiz}
            onSubmitQuizResponse={(response) => submitQuizResponse(sessionId, response)}
            quizResults={quizResults}
          />
        )}
      </main>
    </div>
  );
}
