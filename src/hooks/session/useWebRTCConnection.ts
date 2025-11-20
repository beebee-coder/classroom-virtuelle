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
}

// --- Constantes de Configuration ---
const WEBRTC_CONFIG = {
    MAX_SIGNALS: 25,
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

    // CORRECTION : Fonction de nettoyage améliorée
    const cleanupPeerConnection = useCallback((userId: string): void => {
        pendingConnectionsRef.current.delete(userId);
        
        const peer = peersRef.current.get(userId);
        if (peer && !peer.destroyed) {
            console.log(`🧹 [PEER CLEANUP] - Destruction du peer pour: ${userId}`);
            try {
                peer.destroy();
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
                stream?.getTracks().forEach(track => track.stop());
                newMap.delete(userId);
                return newMap;
            }
            return prev;
        });
    }, []);

    // CORRECTION : Fonction d'envoi de signal via Ably direct
    const signalViaAbly = useCallback(async (targetUserId: string, signal: PeerSignalData, isReturnSignal: boolean = false) => {
        try {
            const channelName = getSessionChannelName(sessionId);
            await ablyTrigger(channelName, AblyEvents.SIGNAL, {
                userId: currentUserId,
                target: targetUserId,
                signal: signal,
                isReturnSignal: isReturnSignal
            });
            console.log(`📤 [SIGNAL] - Signal ${signal.type} envoyé à ${targetUserId}`);
        } catch (error) {
            console.error('❌ [SIGNAL] - Erreur d\'envoi du signal via Ably:', error);
        }
    }, [sessionId, currentUserId]);

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
            
            // CORRECTION : Mise à jour de l'état du peer
            peerStatesRef.current.set(targetUserId, { 
                isConnected: false, 
                isConnecting: true, 
                connectionAttempts: (existingState?.connectionAttempts || 0) + 1,
                lastAttempt: now, 
                signalCount: 0, 
                hasReceivedStream: false
            });

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

            let signalCount = 0;
            const processedCandidates = new Set<string>();

            // CORRECTION : Gestion des signaux avec délais optimisés
            peer.on('signal', (signal: PeerSignalData) => {
                if (!isMounted || peer.destroyed) return;
                
                signalCount++;
                
                // CORRECTION : Limite de signaux pour éviter le spam
                if (signalCount > WEBRTC_CONFIG.MAX_SIGNALS) {
                    console.warn(`⚠️ [SIGNAL] - Trop de signaux pour ${targetUserId} (${signalCount}), arrêt`);
                    return;
                }
                
                // CORRECTION : Éviter les doublons de candidats ICE
                if (signal.type === 'candidate') {
                    const candidateKey = JSON.stringify(signal);
                    if (processedCandidates.has(candidateKey)) {
                        return;
                    }
                    processedCandidates.add(candidateKey);
                }
                
                // CORRECTION : Délai progressif pour les candidats ICE
                const delay = signal.type === 'candidate' ? Math.min(signalCount * 50, 500) : 0;
                
                setTimeout(() => {
                    if (isMounted && !peer.destroyed) {
                        signalViaAbly(targetUserId, signal, !initiator);
                    }
                }, delay);
            });

            // CORRECTION : Gestion du stream distant avec validation
            peer.on('stream', (remoteStream: MediaStream) => {
                if (!isMounted) return;
                
                const hasVideo = remoteStream.getVideoTracks().length > 0;
                const hasAudio = remoteStream.getAudioTracks().length > 0;
                
                console.log(`📥 [STREAM] - Stream reçu de ${targetUserId}, vidéo: ${hasVideo}, audio: ${hasAudio}`);
                
                if (hasVideo || hasAudio) {
                    setRemoteStreams(prev => {
                        const newMap = new Map(prev);
                        newMap.set(targetUserId, remoteStream);
                        return newMap;
                    });
                    
                    // CORRECTION : Mise à jour de l'état avec succès
                    peerStatesRef.current.set(targetUserId, { 
                        isConnected: true, 
                        isConnecting: false,
                        connectionAttempts: 0,
                        lastAttempt: Date.now(),
                        signalCount,
                        hasReceivedStream: true
                    });
                    
                    pendingConnectionsRef.current.delete(targetUserId);
                    console.log(`✅ [PEER CONNECTED] - Connexion établie avec ${targetUserId}`);
                } else {
                    console.warn(`⚠️ [STREAM] - Stream vide reçu de ${targetUserId}`);
                }
            });

            // CORRECTION : Gestion de la connexion
            peer.on('connect', () => {
                console.log(`🔗 [PEER CONNECT] - Connexion WebRTC établie avec ${targetUserId}`);
                
                peerStatesRef.current.set(targetUserId, { 
                    isConnected: true, 
                    isConnecting: false,
                    connectionAttempts: 0,
                    lastAttempt: Date.now(),
                    signalCount,
                    hasReceivedStream: peerStatesRef.current.get(targetUserId)?.hasReceivedStream || false
                });
                
                pendingConnectionsRef.current.delete(targetUserId);
            });

            // CORRECTION : Gestion d'erreur améliorée
            peer.on('error', (err: Error) => {
                console.error(`❌ [PEER ERROR] - Erreur avec ${targetUserId}:`, err);
                
                const currentState = peerStatesRef.current.get(targetUserId);
                
                if (!currentState?.hasReceivedStream) {
                    peerStatesRef.current.set(targetUserId, { 
                        isConnected: false, 
                        isConnecting: false,
                        connectionAttempts: currentState?.connectionAttempts || 1,
                        lastAttempt: Date.now(),
                        signalCount,
                        hasReceivedStream: false
                    });
                    
                    // CORRECTION : Nettoyage après erreur
                    setTimeout(() => {
                        if (isMounted && !peerStatesRef.current.get(targetUserId)?.hasReceivedStream) {
                            console.log(`🔄 [PEER RETRY] - Nettoyage après erreur pour ${targetUserId}`);
                            cleanupPeerConnection(targetUserId);
                        }
                    }, 3000);
                }
                
                pendingConnectionsRef.current.delete(targetUserId);
            });
            
            // CORRECTION : Gestion de fermeture
            peer.on('close', () => {
                console.log(`🔒 [PEER CLOSE] - Connexion fermée avec ${targetUserId}`);
                
                const currentState = peerStatesRef.current.get(targetUserId);
                if (!currentState?.hasReceivedStream) {
                    peerStatesRef.current.set(targetUserId, { 
                        isConnected: false, 
                        isConnecting: false,
                        connectionAttempts: 0,
                        lastAttempt: Date.now(),
                        signalCount,
                        hasReceivedStream: false
                    });
                }
                
                pendingConnectionsRef.current.delete(targetUserId);
            });

            // CORRECTION : Nettoyage de l'ancien peer si existe
            const existingPeer = peersRef.current.get(targetUserId);
            if (existingPeer && !existingPeer.destroyed) {
                try {
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