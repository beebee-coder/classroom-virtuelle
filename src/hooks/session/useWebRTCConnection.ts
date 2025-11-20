// src/hooks/session/useWebRTCConnection.ts - VERSION CORRIGÉE SANS ERREURS TS
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { Instance as PeerInstance, SignalData as PeerSignalData } from 'simple-peer';
import SimplePeer from 'simple-peer';
import { getSessionChannelName } from '@/lib/ably/channels';

// --- Types ---
interface PeerState {
    isConnected: boolean;
    isConnecting: boolean;
    connectionAttempts: number;
    lastAttempt: number;
    signalCount: number;
    hasReceivedStream: boolean;
}

interface SignalPayload {
    channelName: string;
    userId: string;
    target: string;
    signal: PeerSignalData;
    isReturnSignal: boolean;
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

// --- Fonction d'aide ---
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

// --- Le Hook ---
export function useWebRTCConnection(sessionId: string, currentUserId: string, localStream: MediaStream | null, isMounted: boolean) {
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const peersRef = useRef<Map<string, PeerInstance>>(new Map());
    const peerStatesRef = useRef<Map<string, PeerState>>(new Map());
    const pendingConnectionsRef = useRef<Set<string>>(new Set());

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

    // DÉPLACÉ: Déclarer createPeer AVANT handleIncomingSignal
    const createPeer = useCallback((targetUserId: string, initiator: boolean, stream: MediaStream | null): PeerInstance | undefined => {
        if (!isMounted) {
            console.warn(`⚠️ [PEER CREATION] - Composant non monté, création annulée pour ${targetUserId}`);
            return undefined;
        }

        const existingState = peerStatesRef.current.get(targetUserId);
        
        // Vérifier si déjà connecté
        if (existingState?.isConnected) {
            console.log(`🔗 [PEER SKIP] - Déjà connecté à ${targetUserId}, création annulée`);
            return undefined;
        }

        // Vérifier les connexions en cours
        if (pendingConnectionsRef.current.has(targetUserId)) {
            console.log(`⏳ [PEER BUSY] - Connexion déjà en cours pour ${targetUserId}`);
            return undefined;
        }

        // Vérifier les tentatives de reconnexion
        const now = Date.now();
        if (existingState && 
            existingState.connectionAttempts >= WEBRTC_CONFIG.MAX_CONNECTION_ATTEMPTS && 
            now - existingState.lastAttempt < WEBRTC_CONFIG.RETRY_DELAY) {
            console.log(`🛑 [PEER LIMIT] - Trop de tentatives pour ${targetUserId}, attente...`);
            return undefined;
        }

        console.log(`🤝 [PEER CREATION] - Création du peer pour: ${targetUserId}. Initiateur: ${initiator}, Stream: ${!!stream}`);

        try {
            pendingConnectionsRef.current.add(targetUserId);
            
            peerStatesRef.current.set(targetUserId, { 
                isConnected: false, 
                isConnecting: true, 
                connectionAttempts: (existingState?.connectionAttempts || 0) + 1,
                lastAttempt: now, 
                signalCount: 0, 
                hasReceivedStream: false
            });

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

            peer.on('signal', (signal: PeerSignalData) => {
                if (!isMounted || peer.destroyed) return;
                
                signalCount++;
                
                // Limiter le nombre de signaux pour éviter les boucles infinies
                if (signalCount > WEBRTC_CONFIG.MAX_SIGNALS) {
                    console.warn(`🛑 [SIGNAL LIMIT] - Trop de signaux pour ${targetUserId} (${signalCount}), arrêt`);
                    return;
                }
                
                // Filtrer les candidats ICE dupliqués
                if (signal.type === 'candidate') {
                    const candidateKey = JSON.stringify(signal);
                    if (processedCandidates.has(candidateKey)) {
                        console.log(`🔄 [ICE FILTER] - Candidat ICE dupliqué ignoré pour ${targetUserId}`);
                        return;
                    }
                    processedCandidates.add(candidateKey);
                }
                
                console.log(`📡 [PEER SIGNAL] - Envoi du signal ${signalCount}/${WEBRTC_CONFIG.MAX_SIGNALS} de ${currentUserId} à ${targetUserId} (type: ${signal.type})`);
                
                // Délai progressif pour les candidats ICE
                const delay = signal.type === 'candidate' ? Math.min(signalCount * 50, 500) : 0;
                
                setTimeout(() => {
                    if (isMounted && !peer.destroyed) {
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

            peer.on('stream', (remoteStream: MediaStream) => {
                if (!isMounted) return;
                
                console.log(`🎉 ✅ [PEER STREAM SUCCESS] - Stream reçu de ${targetUserId} après ${signalCount} signaux`);
                
                // Vérifier que le stream est valide
                const hasVideo = remoteStream.getVideoTracks().length > 0;
                const hasAudio = remoteStream.getAudioTracks().length > 0;
                
                if (hasVideo || hasAudio) {
                    setRemoteStreams(prev => {
                        const newMap = new Map(prev);
                        newMap.set(targetUserId, remoteStream);
                        return newMap;
                    });
                    
                    peerStatesRef.current.set(targetUserId, { 
                        isConnected: true, 
                        isConnecting: false,
                        connectionAttempts: 0,
                        lastAttempt: Date.now(),
                        signalCount,
                        hasReceivedStream: true
                    });
                    
                    pendingConnectionsRef.current.delete(targetUserId);
                    
                    console.log(`🏁 [CONNECTION STABLE] - Connexion établie avec ${targetUserId} (vidéo: ${hasVideo}, audio: ${hasAudio})`);
                } else {
                    console.warn(`⚠️ [PEER STREAM INVALID] - Stream de ${targetUserId} sans pistes valides`);
                }
            });

            peer.on('connect', () => {
                console.log(`🔗 [PEER CONNECT] - Connexion peer établie avec ${targetUserId}`);
                
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

            peer.on('error', (err: Error) => {
                console.error(`❌ [PEER ERROR] - Erreur avec ${targetUserId} après ${signalCount} signaux:`, err);
                
                const currentState = peerStatesRef.current.get(targetUserId);
                
                // Ne pas nettoyer immédiatement si on a déjà reçu un stream
                if (!currentState?.hasReceivedStream) {
                    peerStatesRef.current.set(targetUserId, { 
                        isConnected: false, 
                        isConnecting: false,
                        connectionAttempts: currentState?.connectionAttempts || 1,
                        lastAttempt: Date.now(),
                        signalCount,
                        hasReceivedStream: false
                    });
                    
                    // Nettoyer seulement si pas de stream reçu
                    setTimeout(() => {
                        if (isMounted && !peerStatesRef.current.get(targetUserId)?.hasReceivedStream) {
                            console.log(`🧹 [PEER CLEANUP ERROR] - Nettoyage après erreur pour ${targetUserId}`);
                            cleanupPeerConnection(targetUserId);
                        }
                    }, 3000);
                }
                
                pendingConnectionsRef.current.delete(targetUserId);
            });
            
            peer.on('close', () => {
                console.log(`🚪 [PEER CLOSE] - Connexion fermée pour ${targetUserId} après ${signalCount} signaux`);
                
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

            // Nettoyer l'ancien peer s'il existe
            const existingPeer = peersRef.current.get(targetUserId);
            if (existingPeer && !existingPeer.destroyed) {
                try {
                    console.log(`🔄 [PEER REPLACE] - Remplacement de l'ancien peer pour ${targetUserId}`);
                    existingPeer.destroy();
                } catch (error) {
                    console.warn(`⚠️ [PEER CLEANUP] - Erreur destruction ancien peer ${targetUserId}:`, error);
                }
            }
            
            peersRef.current.set(targetUserId, peer);
            return peer;
            
        } catch (error) {
            console.error('❌ [PEER CREATION] - Erreur lors de la création:', error);
            
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
    }, [sessionId, currentUserId, cleanupPeerConnection, isMounted]);

    // DÉPLACÉ: handleIncomingSignal APRÈS createPeer
    const handleIncomingSignal = useCallback((fromUserId: string, signal: PeerSignalData) => {
        if (!isMounted) {
            console.warn('⚠️ [SIGNAL] - Composant non monté, signal ignoré');
            return;
        }

        console.log(`🔔 [SIGNAL INCOMING] - Traitement du signal de ${fromUserId} (type: ${signal.type})`);

        // Vérifier l'état actuel de la connexion
        const existingState = peerStatesRef.current.get(fromUserId);
        if (existingState?.isConnected) {
            console.log(`🔗 [SIGNAL SKIP] - Déjà connecté à ${fromUserId}, signal ignoré`);
            return;
        }

        let peer = peersRef.current.get(fromUserId);
        
        // Créer un nouveau peer si nécessaire (pour les élèves qui reçoivent des signaux du professeur)
        if (!peer || peer.destroyed) {
            console.log(`🤝 [PEER CREATE FROM SIGNAL] - Création d'un peer non-initateur pour ${fromUserId}`);
            
            peer = createPeer(fromUserId, false, localStream);
            
            if (!peer) {
                console.error(`❌ [SIGNAL] - Impossible de créer un peer pour ${fromUserId}`);
                return;
            }
            
            // Attendre un court instant que le peer soit initialisé avant de traiter le signal
            setTimeout(() => {
                if (isMounted && peer && !peer.destroyed) {
                    try {
                        console.log(`🔄 [SIGNAL PROCESS DELAYED] - Traitement différé du signal de ${fromUserId}`);
                        peer.signal(signal);
                    } catch (error) {
                        console.error(`❌ [SIGNAL DELAYED] - Erreur traitement signal différé ${fromUserId}:`, error);
                    }
                }
            }, 100);
        } else {
            // Peer existant - traiter le signal immédiatement
            try {
                console.log(`🔄 [SIGNAL PROCESS EXISTING] - Traitement du signal sur peer existant pour ${fromUserId}`);
                peer.signal(signal);
            } catch (error) {
                console.error(`❌ [SIGNAL EXISTING] - Erreur traitement signal ${fromUserId}:`, error);
                
                // En cas d'erreur, tenter de recréer le peer
                console.log(`🔄 [SIGNAL RECOVERY] - Tentative de récupération pour ${fromUserId}`);
                cleanupPeerConnection(fromUserId);
                const newPeer = createPeer(fromUserId, false, localStream);
                if (newPeer) {
                    setTimeout(() => {
                        if (isMounted && newPeer && !newPeer.destroyed) {
                            try {
                                newPeer.signal(signal);
                            } catch (retryError) {
                                console.error(`❌ [SIGNAL RECOVERY FAILED] - Échec récupération ${fromUserId}:`, retryError);
                            }
                        }
                    }, 200);
                }
            }
        }
    }, [createPeer, localStream, isMounted, cleanupPeerConnection]);

    useEffect(() => {
        return () => {
            console.log('🧹 [WEBRTC HOOK] - Nettoyage de tous les peers WebRTC');
            // Nettoyage au démontage du hook
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