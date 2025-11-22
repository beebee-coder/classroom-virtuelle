// src/hooks/session/useWebRTCConnection.ts - VERSION CORRIGÉE
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
}

// --- Constantes de Configuration ---
const WEBRTC_CONFIG = {
    MAX_SIGNALS: 25,
    MAX_SIGNALS_PER_SECOND: 5,
    CONNECTION_TIMEOUT: 30000,
    RETRY_DELAY: 10000,
    MAX_CONNECTION_ATTEMPTS: 3,
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
    
    // CORRECTION : Références pour le throttling des signaux
    const signalTimestampsRef = useRef<Map<string, number[]>>(new Map());
    const processedCandidatesRef = useRef<Map<string, Set<string>>>(new Map());

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
                // CORRECTION : Arrêt propre de tous les tracks
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

    // CORRECTION : Fonction de vérification du taux de signaux
    const canSendSignal = useCallback((targetUserId: string): boolean => {
        const now = Date.now();
        const oneSecondAgo = now - 1000;
        
        let timestamps = signalTimestampsRef.current.get(targetUserId) || [];
        
        // Nettoyer les timestamps anciens
        timestamps = timestamps.filter(timestamp => timestamp > oneSecondAgo);
        
        // Vérifier la limite
        if (timestamps.length >= WEBRTC_CONFIG.MAX_SIGNALS_PER_SECOND) {
            console.warn(`⏸️ [SIGNAL THROTTLING] - Trop de signaux pour ${targetUserId} (${timestamps.length}/s), attente...`);
            return false;
        }
        
        // Ajouter le nouveau timestamp
        timestamps.push(now);
        signalTimestampsRef.current.set(targetUserId, timestamps);
        return true;
    }, []);

    // CORRECTION : Fonction d'envoi de signal avec throttling
    const signalViaAbly = useCallback(async (targetUserId: string, signal: PeerSignalData, isReturnSignal: boolean = false) => {
        if (!isMounted) {
            console.warn('⚠️ [SIGNAL] - Composant non monté, envoi annulé');
            return;
        }

        // CORRECTION : Vérification du taux de signaux
        if (!canSendSignal(targetUserId)) {
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
            
            // CORRECTION : Mise à jour du compteur de signaux
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

        // CORRECTION : Vérifications de connexion existante
        const existingState = peerStatesRef.current.get(targetUserId);
        
        if (existingState?.isConnected) {
            console.log(`⏭️ [PEER CREATION] - Connexion déjà établie avec ${targetUserId}`);
            return undefined;
        }

        if (pendingConnectionsRef.current.has(targetUserId)) {
            console.log(`⏭️ [PEER CREATION] - Connexion en cours avec ${targetUserId}`);
            return undefined;
        }

        // CORRECTION : Logique de retry améliorée
        const now = Date.now();
        if (existingState && 
            existingState.connectionAttempts >= WEBRTC_CONFIG.MAX_CONNECTION_ATTEMPTS && 
            now - existingState.lastAttempt < WEBRTC_CONFIG.RETRY_DELAY) {
            console.warn(`⏸️ [PEER CREATION] - Trop de tentatives pour ${targetUserId}, attente...`);
            return undefined;
        }

        try {
            pendingConnectionsRef.current.add(targetUserId);
            
            // CORRECTION : Initialisation des sets de déduplication
            if (!processedCandidatesRef.current.has(targetUserId)) {
                processedCandidatesRef.current.set(targetUserId, new Set());
            }
            
            // CORRECTION : Mise à jour de l'état du peer
            const newPeerState: PeerState = { 
                isConnected: false, 
                isConnecting: true, 
                connectionAttempts: (existingState?.connectionAttempts || 0) + 1,
                lastAttempt: now, 
                signalCount: 0,
                hasReceivedStream: false,
                lastSignalTime: 0
            };
            peerStatesRef.current.set(targetUserId, newPeerState);

            console.log(`🎯 [PEER CREATION] - Création peer ${initiator ? 'initiateur' : 'répondeur'} pour ${targetUserId}`);

            const peer = new SimplePeer({
                initiator,
                trickle: true, // CORRECTION : ICE trickling activé pour meilleure performance
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

            // CORRECTION : Gestion des signaux avec déduplication et throttling
            peer.on('signal', (signal: PeerSignalData) => {
                if (!isMounted || peer.destroyed) return;
                
                const peerState = peerStatesRef.current.get(targetUserId);
                if (!peerState) return;

                // CORRECTION : Vérification de la limite de signaux
                if (peerState.signalCount >= WEBRTC_CONFIG.MAX_SIGNALS) {
                    console.warn(`⚠️ [SIGNAL] - Trop de signaux pour ${targetUserId} (${peerState.signalCount}), arrêt`);
                    return;
                }
                
                // CORRECTION : Déduplication des candidats ICE
                if (signal.type === 'candidate') {
                    const candidateKey = JSON.stringify(signal.candidate);
                    const processedCandidates = processedCandidatesRef.current.get(targetUserId);
                    
                    if (processedCandidates?.has(candidateKey)) {
                        console.log(`⏭️ [SIGNAL] - Candidat ICE déjà traité pour ${targetUserId}`);
                        return;
                    }
                    processedCandidates?.add(candidateKey);
                }
                
                // CORRECTION : Délai progressif pour les candidats ICE
                const delay = signal.type === 'candidate' ? 
                    Math.min(peerState.signalCount * 50, 500) : 0;
                
                setTimeout(() => {
                    if (isMounted && !peer.destroyed) {
                        signalViaAbly(targetUserId, signal, !initiator);
                    }
                }, delay);
            });

            // CORRECTION : Gestion du stream distant avec validation
           // Dans useWebRTCConnection.ts - handler 'stream'
peer.on('stream', (remoteStream: MediaStream) => {
    if (!isMounted) return;
    
    // CORRECTION : Validation basique pour ajout IMMÉDIAT
    const hasVideo = remoteStream.getVideoTracks().length > 0;
    const hasAudio = remoteStream.getAudioTracks().length > 0;
    const isStreamActive = remoteStream.active;
    
    console.log(`📥 [STREAM] - Stream reçu de ${targetUserId}, actif: ${isStreamActive}, vidéo: ${hasVideo}, audio: ${hasAudio}`);
    
    // CORRECTION : Ajouter le stream IMMÉDIATEMENT s'il est actif
    if (isStreamActive && (hasVideo || hasAudio)) {
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        newMap.set(targetUserId, remoteStream);
        console.log(`✅ [STREAM ADDED] - Stream ajouté pour ${targetUserId}`);
        return newMap;
      });
    } else {
      console.warn(`⚠️ [STREAM] - Stream reçu mais invalide de ${targetUserId}`);
    }
  });

            // CORRECTION : Gestion de la connexion
            peer.on('connect', () => {
                console.log(`🔗 [PEER CONNECT] - Connexion WebRTC établie avec ${targetUserId}`);
                
                const currentPeerState = peerStatesRef.current.get(targetUserId);
                if (currentPeerState) {
                    peerStatesRef.current.set(targetUserId, { 
                        ...currentPeerState,
                        isConnecting: false
                    });
                }
                
                pendingConnectionsRef.current.delete(targetUserId);
            });

            // CORRECTION : Gestion d'erreur améliorée
            peer.on('error', (err: Error) => {
                console.error(`❌ [PEER ERROR] - Erreur avec ${targetUserId}:`, err);
                
                const errorState = peerStatesRef.current.get(targetUserId);
                if (!errorState) return;
                
                if (!errorState.hasReceivedStream) {
                    peerStatesRef.current.set(targetUserId, { 
                        ...errorState,
                        isConnected: false, 
                        isConnecting: false
                    });
                    
                    // CORRECTION : Nettoyage après erreur avec délai
                    setTimeout(() => {
                        if (isMounted && !peerStatesRef.current.get(targetUserId)?.hasReceivedStream) {
                            console.log(`🔄 [PEER RETRY] - Nettoyage après erreur pour ${targetUserId}`);
                            cleanupPeerConnection(targetUserId);
                        }
                    }, 5000);
                }
                
                pendingConnectionsRef.current.delete(targetUserId);
            });
            
            // CORRECTION : Gestion de fermeture
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

            // CORRECTION : Nettoyage de l'ancien peer si existe
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
                lastSignalTime: 0
            });
            return undefined;
        }
    }, [sessionId, currentUserId, cleanupPeerConnection, isMounted, signalViaAbly]);

    // CORRECTION : Gestion des signaux entrants avec réessai
    const handleIncomingSignal = useCallback((fromUserId: string, signal: PeerSignalData) => {
        if (!isMounted) {
            console.warn(`⚠️ [SIGNAL IN] - Composant non monté, signal ignoré de ${fromUserId}`);
            return;
        }

        console.log(`📨 [SIGNAL IN] - Signal ${signal.type} reçu de ${fromUserId}`);

        const existingState = peerStatesRef.current.get(fromUserId);
        if (existingState?.isConnected) {
            console.log(`⏭️ [SIGNAL IN] - Connexion déjà établie avec ${fromUserId}, signal ignoré`);
            return;
        }

        let peer = peersRef.current.get(fromUserId);
        
        if (!peer || peer.destroyed) {
            // CORRECTION : Créer un nouveau peer en mode répondeur
            console.log(`🔄 [SIGNAL IN] - Création nouveau peer répondeur pour ${fromUserId}`);
            peer = createPeer(fromUserId, false, localStream);
            
            if (!peer) {
                console.warn(`⚠️ [SIGNAL IN] - Impossible de créer le peer pour ${fromUserId}`);
                return;
            }
            
            // CORRECTION : Appliquer le signal après un court délai
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
            // CORRECTION : Appliquer le signal au peer existant
            try {
                console.log(`🔄 [SIGNAL IN] - Application du signal au peer existant pour ${fromUserId}`);
                peer.signal(signal);
            } catch (error) {
                console.error(`❌ [SIGNAL IN] - Erreur avec peer existant, recréation pour ${fromUserId}:`, error);
                
                // CORRECTION : Recréer le peer en cas d'erreur
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
    }, [createPeer, localStream, isMounted, cleanupPeerConnection]);

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