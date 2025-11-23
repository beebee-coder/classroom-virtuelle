// src/hooks/session/useWebRTCConnection.ts - VERSION COMPLÈTE CORRIGÉE
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { Instance as PeerInstance, SignalData as PeerSignalData } from 'simple-peer';
import SimplePeer from 'simple-peer';
import { getSessionChannelName } from '@/lib/ably/channels';
import { ablyTrigger } from '@/lib/ably/triggers';
import { AblyEvents } from '@/lib/ably/events';

// --- Types ---
interface PeerState {
    isConnected: boolean;
    isConnecting: boolean;
    connectionAttempts: number;
    lastAttempt: number;
    signalCount: number;
    hasReceivedStream: boolean;
    lastSignalTime: number;
    lastStreamCheck: number;
}

// --- Constantes de Configuration OPTIMISÉES ---
const WEBRTC_CONFIG = {
    MAX_SIGNALS: 100,
    MAX_SIGNALS_PER_SECOND: 30,
    CONNECTION_TIMEOUT: 30000,
    RETRY_DELAY: 10000,
    MAX_CONNECTION_ATTEMPTS: 3,
    STREAM_CHECK_INTERVAL: 2000,
    ICE_SERVERS: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }
    ]
};

// --- Le Hook ---
export function useWebRTCConnection(sessionId: string, currentUserId: string, localStream: MediaStream | null, isMounted: boolean) {
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const peersRef = useRef<Map<string, PeerInstance>>(new Map());
    const peerStatesRef = useRef<Map<string, PeerState>>(new Map());
    const pendingConnectionsRef = useRef<Set<string>>(new Set());
    
    const signalTimestampsRef = useRef<Map<string, number[]>>(new Map());
    const processedCandidatesRef = useRef<Map<string, Set<string>>>(new Map());

    // CORRECTION : Fonction de vérification d'état de connexion améliorée avec typage correct
    const isConnectionReallyEstablished = useCallback((userId: string): boolean => {
        const peerState = peerStatesRef.current.get(userId);
        if (!peerState) return false;
        
        const remoteStream = remoteStreams.get(userId);
        const peer = peersRef.current.get(userId);
        
        // ✅ CORRECTION : Rendre la vérification plus stricte
        const isStreamActive = remoteStream?.active && 
                               (remoteStream.getVideoTracks().some(t => t.readyState === 'live') || 
                                remoteStream.getAudioTracks().some(t => t.readyState === 'live'));
        
        const isPeerConnected = peer ? !peer.destroyed && !!peer.connected : false;
        
        return peerState.isConnected && isStreamActive && isPeerConnected;
    }, [remoteStreams]);


    // CORRECTION : Fonction de nettoyage améliorée
    const cleanupPeerConnection = useCallback((userId: string): void => {
        console.log(`🧹 [PEER CLEANUP] - Nettoyage de la connexion pour: ${userId}`);
        
        pendingConnectionsRef.current.delete(userId);
        signalTimestampsRef.current.delete(userId);
        processedCandidatesRef.current.delete(userId);
        
        const peer = peersRef.current.get(userId);
        if (peer && !peer.destroyed) {
            try {
                peer.destroy();
                console.log(`✅ [PEER CLEANUP] - Peer détruit pour: ${userId}`);
            } catch (error) {
                console.warn(`⚠️ [PEER CLEANUP] - Erreur lors de la destruction pour ${userId}:`, error);
            }
        }
        peersRef.current.delete(userId);
        peerStatesRef.current.delete(userId);
        
        setRemoteStreams(prev => {
            const newMap = new Map(prev);
            if (newMap.has(userId)) {
                console.log(`📹 [STREAM CLEANUP] - Suppression du stream distant pour: ${userId}`);
                const stream = newMap.get(userId);
                stream?.getTracks().forEach(track => {
                    track.stop();
                    track.enabled = false;
                });
                newMap.delete(userId);
                return newMap;
            }
            return prev;
        });
    }, []);

    // CORRECTION : Fonction de vérification du taux de signaux OPTIMISÉE
    const canSendSignal = useCallback((targetUserId: string, signalType?: string): boolean => {
        const now = Date.now();
        const oneSecondAgo = now - 1000;
        
        let timestamps = signalTimestampsRef.current.get(targetUserId) || [];
        timestamps = timestamps.filter(timestamp => timestamp > oneSecondAgo);
        
        // ✅ CORRECTION : Pas de throttling pour les candidats ICE une fois connecté
        const peerState = peerStatesRef.current.get(targetUserId);
        if (peerState?.hasReceivedStream && signalType === 'candidate') {
            return true;
        }
        
        const maxSignals = signalType === 'candidate' ? 
            WEBRTC_CONFIG.MAX_SIGNALS_PER_SECOND * 3 :
            WEBRTC_CONFIG.MAX_SIGNALS_PER_SECOND;
        
        if (timestamps.length >= maxSignals) {
            console.warn(`⏸️ [SIGNAL THROTTLING] - Trop de signaux pour ${targetUserId} (${timestamps.length}/${maxSignals}s), attente...`);
            return false;
        }
        
        timestamps.push(now);
        signalTimestampsRef.current.set(targetUserId, timestamps);
        return true;
    }, []);

    // CORRECTION : Fonction d'envoi de signal avec throttling OPTIMISÉ
    const signalViaAbly = useCallback(async (targetUserId: string, signal: PeerSignalData, isReturnSignal: boolean = false) => {
        if (!isMounted) {
            console.warn('⚠️ [SIGNAL] - Composant non monté, envoi annulé');
            return;
        }

        if (!canSendSignal(targetUserId, signal.type)) {
            if (signal.type === 'candidate') {
                console.log(`🔄 [SIGNAL] - Candidat ICE throttlé mais critique, réessai...`);
                setTimeout(() => {
                    if (isMounted) {
                        signalViaAbly(targetUserId, signal, isReturnSignal);
                    }
                }, 50);
            }
            return;
        }

        try {
            const channelName = getSessionChannelName(sessionId);
            await ablyTrigger(channelName, AblyEvents.SIGNAL, {
                userId: currentUserId,
                target: targetUserId,
                signal: signal,
                isReturnSignal: isReturnSignal,
                timestamp: Date.now()
            });
            
            const currentState = peerStatesRef.current.get(targetUserId);
            if (currentState) {
                peerStatesRef.current.set(targetUserId, {
                    ...currentState,
                    signalCount: currentState.signalCount + 1,
                    lastSignalTime: Date.now()
                });
            }
            
            console.log(`📤 [SIGNAL] - Signal ${signal.type} envoyé à ${targetUserId} (total: ${currentState?.signalCount || 0})`);
        } catch (error) {
            console.error('❌ [SIGNAL] - Erreur d\'envoi du signal via Ably:', error);
        }
    }, [sessionId, currentUserId, isMounted, canSendSignal]);

    // CORRECTION : Fonction de création de peer avec gestion d'erreur améliorée
    const createPeer = useCallback((targetUserId: string, initiator: boolean, stream: MediaStream | null): PeerInstance | undefined => {
        if (!isMounted) {
            console.warn(`⚠️ [PEER CREATION] - Composant non monté, création annulée pour ${targetUserId}`);
            return undefined;
        }

        // ✅ CORRECTION : Utiliser la vérification améliorée
        if (isConnectionReallyEstablished(targetUserId)) {
            console.log(`⏭️ [PEER CREATION] - Connexion RÉELLEMENT établie avec ${targetUserId}`);
            return undefined;
        }

        if (pendingConnectionsRef.current.has(targetUserId)) {
            console.log(`⏭️ [PEER CREATION] - Connexion en cours avec ${targetUserId}`);
            return undefined;
        }

        const now = Date.now();
        const existingState = peerStatesRef.current.get(targetUserId);
        if (existingState && 
            existingState.connectionAttempts >= WEBRTC_CONFIG.MAX_CONNECTION_ATTEMPTS && 
            now - existingState.lastAttempt < WEBRTC_CONFIG.RETRY_DELAY) {
            console.warn(`⏸️ [PEER CREATION] - Trop de tentatives pour ${targetUserId}, attente...`);
            return undefined;
        }

        try {
            pendingConnectionsRef.current.add(targetUserId);
            
            if (!processedCandidatesRef.current.has(targetUserId)) {
                processedCandidatesRef.current.set(targetUserId, new Set());
            }
            
            const newPeerState: PeerState = { 
                isConnected: false, 
                isConnecting: true, 
                connectionAttempts: (existingState?.connectionAttempts || 0) + 1,
                lastAttempt: now, 
                signalCount: 0,
                hasReceivedStream: false,
                lastSignalTime: 0,
                lastStreamCheck: 0
            };
            peerStatesRef.current.set(targetUserId, newPeerState);

            console.log(`🎯 [PEER CREATION] - Création peer ${initiator ? 'initiateur' : 'répondeur'} pour ${targetUserId}`);

            const peer = new SimplePeer({
                initiator,
                trickle: true,
                stream: stream || undefined,
                config: { 
                    iceServers: WEBRTC_CONFIG.ICE_SERVERS,
                    iceCandidatePoolSize: 10,
                    iceTransportPolicy: 'all'
                },
                offerOptions: {
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: true
                }
            });

            peer.on('signal', (signal: PeerSignalData) => {
                if (!isMounted || peer.destroyed) return;
                
                const peerState = peerStatesRef.current.get(targetUserId);
                if (!peerState) return;

                if (peerState.signalCount >= WEBRTC_CONFIG.MAX_SIGNALS) {
                    console.warn(`⚠️ [SIGNAL] - Trop de signaux pour ${targetUserId} (${peerState.signalCount}), mais continuation pour ICE`);
                    if (signal.type !== 'candidate') return;
                }
                
                if (signal.type === 'candidate') {
                    const candidateKey = JSON.stringify(signal.candidate);
                    const processedCandidates = processedCandidatesRef.current.get(targetUserId);
                    
                    if (processedCandidates?.has(candidateKey)) {
                        console.log(`⏭️ [SIGNAL] - Candidat ICE déjà traité pour ${targetUserId}`);
                        return;
                    }
                    processedCandidates?.add(candidateKey);
                }
                
                const delay = signal.type === 'candidate' ? 
                    Math.min(peerState.signalCount * 10, 100) : 0;
                
                setTimeout(() => {
                    if (isMounted && !peer.destroyed) {
                        signalViaAbly(targetUserId, signal, !initiator);
                    }
                }, delay);
            });

            peer.on('stream', (remoteStream: MediaStream) => {
                if (!isMounted) return;
                
                const hasVideo = remoteStream.getVideoTracks().length > 0;
                const hasAudio = remoteStream.getAudioTracks().length > 0;
                const isStreamActive = remoteStream.active;
                
                console.log(`📥 [STREAM] - Stream reçu de ${targetUserId}, actif: ${isStreamActive}, vidéo: ${hasVideo}, audio: ${hasAudio}`);
                
                if (isStreamActive) {
                    setRemoteStreams(prev => {
                        const newMap = new Map(prev);
                        newMap.set(targetUserId, remoteStream);
                        
                        const currentState = peerStatesRef.current.get(targetUserId);
                        if (currentState) {
                            peerStatesRef.current.set(targetUserId, {
                                ...currentState,
                                hasReceivedStream: true,
                                isConnected: true,
                                isConnecting: false,
                                lastStreamCheck: Date.now()
                            });
                        }
                        
                        console.log(`✅ [STREAM ADDED] - Stream ajouté pour ${targetUserId} (vidéo: ${hasVideo}, audio: ${hasAudio})`);
                        return newMap;
                    });
                    
                    pendingConnectionsRef.current.delete(targetUserId);
                } else {
                    console.warn(`⚠️ [STREAM] - Stream inactif reçu de ${targetUserId}`);
                }
            });

            peer.on('connect', () => {
                console.log(`🔗 [PEER CONNECT] - Connexion WebRTC établie avec ${targetUserId}`);
                
                const currentPeerState = peerStatesRef.current.get(targetUserId);
                if (currentPeerState) {
                    peerStatesRef.current.set(targetUserId, { 
                        ...currentPeerState,
                        isConnected: true,
                        isConnecting: false,
                        lastStreamCheck: Date.now()
                    });
                }
                
                pendingConnectionsRef.current.delete(targetUserId);
            });

            // ✅ CORRECTION CRITIQUE : Gestion spécifique des InvalidStateError
            peer.on('error', (err: Error) => {
                console.error(`❌ [PEER ERROR] - Erreur avec ${targetUserId}:`, err);
                
                const errorState = peerStatesRef.current.get(targetUserId);
                if (!errorState) return;
                
                // ✅ CORRECTION : Gestion spécifique pour InvalidStateError (erreur normale WebRTC)
                if (err.name === 'InvalidStateError' || err.message.includes('wrong state: stable')) {
                    console.log(`🔄 [PEER RECOVERY] - Erreur d'état WebRTC normale, connexion déjà établie pour ${targetUserId}`);
                    
                    // Ne pas nettoyer si le stream est actif
                    if (errorState.hasReceivedStream) {
                        console.log(`⏭️ [PEER RECOVERY] - Stream actif détecté, maintien de la connexion pour ${targetUserId}`);
                        return; // Ne pas détruire la connexion
                    }
                }
                
                if (!errorState.hasReceivedStream) {
                    peerStatesRef.current.set(targetUserId, { 
                        ...errorState,
                        isConnected: false, 
                        isConnecting: false
                    });
                    
                    setTimeout(() => {
                        if (isMounted && !peerStatesRef.current.get(targetUserId)?.hasReceivedStream) {
                            console.log(`🔄 [PEER RETRY] - Nettoyage après erreur pour ${targetUserId}`);
                            cleanupPeerConnection(targetUserId);
                        }
                    }, 5000);
                }
                
                pendingConnectionsRef.current.delete(targetUserId);
            });
            
            peer.on('close', () => {
                console.log(`🔒 [PEER CLOSE] - Connexion fermée avec ${targetUserId}`);
                
                const closeState = peerStatesRef.current.get(targetUserId);
                if (closeState && !closeState.hasReceivedStream) {
                    peerStatesRef.current.set(targetUserId, { 
                        ...closeState,
                        isConnected: false, 
                        isConnecting: false
                    });
                }
                
                pendingConnectionsRef.current.delete(targetUserId);
            });

            const existingPeer = peersRef.current.get(targetUserId);
            if (existingPeer && !existingPeer.destroyed) {
                try {
                    console.log(`🔄 [PEER CLEANUP] - Destruction de l'ancien peer pour ${targetUserId}`);
                    existingPeer.destroy();
                } catch (error) {
                    console.warn(`⚠️ [PEER CLEANUP] - Erreur lors de la destruction de l'ancien peer:`, error);
                }
            }
            
            peersRef.current.set(targetUserId, peer);
            return peer;
            
        } catch (error) {
            console.error(`❌ [PEER CREATION] - Erreur lors de la création du peer pour ${targetUserId}:`, error);
            
            pendingConnectionsRef.current.delete(targetUserId);
            
            const errorExistingState = peerStatesRef.current.get(targetUserId);
            peerStatesRef.current.set(targetUserId, { 
                isConnected: false, 
                isConnecting: false,
                connectionAttempts: (errorExistingState?.connectionAttempts || 0) + 1,
                lastAttempt: Date.now(),
                signalCount: 0,
                hasReceivedStream: false,
                lastSignalTime: 0,
                lastStreamCheck: 0
            });
            return undefined;
        }
    }, [sessionId, currentUserId, cleanupPeerConnection, isMounted, signalViaAbly, isConnectionReallyEstablished]);

    // ✅ CORRECTION CRITIQUE : Gestion des signaux entrants avec gestion d'erreur améliorée
    const handleIncomingSignal = useCallback((fromUserId: string, signal: PeerSignalData) => {
        if (!isMounted) {
            console.warn(`⚠️ [SIGNAL IN] - Composant non monté, signal ignoré de ${fromUserId}`);
            return;
        }

        console.log(`📨 [SIGNAL IN] - Signal ${signal.type} reçu de ${fromUserId}`);

        // ✅ CORRECTION : Utiliser la vérification améliorée au lieu de isConnected brut
        if (isConnectionReallyEstablished(fromUserId)) {
            console.log(`⏭️ [SIGNAL IN] - Connexion RÉELLEMENT établie avec ${fromUserId}, signal ${signal.type} ignoré`);
            return;
        }

        let peer = peersRef.current.get(fromUserId);
        
        if (!peer || peer.destroyed) {
            console.log(`🔄 [SIGNAL IN] - Création nouveau peer répondeur pour ${fromUserId}`);
            peer = createPeer(fromUserId, false, localStream);
            
            if (!peer) {
                console.warn(`⚠️ [SIGNAL IN] - Impossible de créer le peer pour ${fromUserId}`);
                return;
            }
            
            setTimeout(() => {
                if (isMounted && peer && !peer.destroyed) {
                    try {
                        console.log(`🔄 [SIGNAL IN] - Application du signal à nouveau peer pour ${fromUserId}`);
                        peer.signal(signal);
                    } catch (error) {
                        console.error(`❌ [SIGNAL IN] - Erreur lors de l'application du signal:`, error);
                    }
                }
            }, 100);
        } else {
            // ✅ CORRECTION : Vérifier l'état du peer avant d'appliquer le signal
            const peerState = peerStatesRef.current.get(fromUserId);
            if (peerState?.hasReceivedStream && signal.type === 'answer') {
                console.log(`⏭️ [SIGNAL IN] - Stream déjà reçu, signal answer ignoré pour ${fromUserId}`);
                return;
            }
            
            try {
                console.log(`🔄 [SIGNAL IN] - Application du signal au peer existant pour ${fromUserId}`);
                peer.signal(signal);
            } catch (error) {
                console.error(`❌ [SIGNAL IN] - Erreur avec peer existant pour ${fromUserId}:`, error);
                
                if (error instanceof Error) {
                    // ✅ CORRECTION : Ne pas nettoyer si c'est une erreur d'état normale
                    if (error.name === 'InvalidStateError' || error.message.includes('wrong state: stable')) {
                        console.log(`🔄 [SIGNAL IN] - Erreur d'état normale, connexion déjà établie pour ${fromUserId}`);
                        return;
                    }
                }
                
                cleanupPeerConnection(fromUserId);
                const newPeer = createPeer(fromUserId, false, localStream);
                if (newPeer) {
                    setTimeout(() => {
                        if (isMounted && newPeer && !newPeer.destroyed) {
                            try {
                                newPeer.signal(signal);
                            } catch (retryError) {
                                console.error(`❌ [SIGNAL IN] - Erreur lors de la réapplication du signal:`, retryError);
                            }
                        }
                    }, 200);
                }
            }
        }
    }, [createPeer, localStream, isMounted, cleanupPeerConnection, isConnectionReallyEstablished]);

    // ✅ CORRECTION : Vérification périodique des streams
    useEffect(() => {
        const interval = setInterval(() => {
            if (!isMounted) return;
            
            const now = Date.now();
            remoteStreams.forEach((stream, userId) => {
                const peerState = peerStatesRef.current.get(userId);
                if (peerState && now - peerState.lastStreamCheck > WEBRTC_CONFIG.STREAM_CHECK_INTERVAL) {
                    
                    // Vérifier si le stream est toujours actif
                    const isStreamActive = stream.active;
                    const hasVideoTracks = stream.getVideoTracks().length > 0;
                    const hasAudioTracks = stream.getAudioTracks().length > 0;
                    
                    if (!isStreamActive || (!hasVideoTracks && !hasAudioTracks)) {
                        console.warn(`⚠️ [STREAM CHECK] - Stream inactif détecté pour ${userId}, nettoyage...`);
                        cleanupPeerConnection(userId);
                    } else {
                        // Mettre à jour le timestamp de vérification
                        peerStatesRef.current.set(userId, {
                            ...peerState,
                            lastStreamCheck: now
                        });
                    }
                }
            });
        }, WEBRTC_CONFIG.STREAM_CHECK_INTERVAL);

        return () => clearInterval(interval);
    }, [remoteStreams, cleanupPeerConnection, isMounted]);

    // CORRECTION : Nettoyage complet lors du démontage
    useEffect(() => {
        return () => {
            console.log(`🧹 [WEBRTC CLEANUP] - Nettoyage de toutes les connexions WebRTC`);
            Array.from(peersRef.current.keys()).forEach(cleanupPeerConnection);
            signalTimestampsRef.current.clear();
            processedCandidatesRef.current.clear();
        };
    }, [cleanupPeerConnection]);

    return {
        remoteStreams,
        peersRef,
        createPeer,
        cleanupPeerConnection,
        handleIncomingSignal
    };
}
