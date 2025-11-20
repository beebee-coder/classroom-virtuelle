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

    const createPeer = useCallback((targetUserId: string, initiator: boolean, stream: MediaStream | null): PeerInstance | undefined => {
        if (!isMounted) {
            console.warn(`⚠️ [PEER CREATION] - Composant non monté, création annulée pour ${targetUserId}`);
            return undefined;
        }

        const existingState = peerStatesRef.current.get(targetUserId);
        
        if (existingState?.isConnected) {
            return undefined;
        }

        if (pendingConnectionsRef.current.has(targetUserId)) {
            return undefined;
        }

        const now = Date.now();
        if (existingState && 
            existingState.connectionAttempts >= WEBRTC_CONFIG.MAX_CONNECTION_ATTEMPTS && 
            now - existingState.lastAttempt < WEBRTC_CONFIG.RETRY_DELAY) {
            return undefined;
        }

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
                
                if (signalCount > WEBRTC_CONFIG.MAX_SIGNALS) {
                    return;
                }
                
                if (signal.type === 'candidate') {
                    const candidateKey = JSON.stringify(signal);
                    if (processedCandidates.has(candidateKey)) {
                        return;
                    }
                    processedCandidates.add(candidateKey);
                }
                
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
                }
            });

            peer.on('connect', () => {
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
                    
                    setTimeout(() => {
                        if (isMounted && !peerStatesRef.current.get(targetUserId)?.hasReceivedStream) {
                            cleanupPeerConnection(targetUserId);
                        }
                    }, 3000);
                }
                
                pendingConnectionsRef.current.delete(targetUserId);
            });
            
            peer.on('close', () => {
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

            const existingPeer = peersRef.current.get(targetUserId);
            if (existingPeer && !existingPeer.destroyed) {
                try {
                    existingPeer.destroy();
                } catch (error) {
                }
            }
            
            peersRef.current.set(targetUserId, peer);
            return peer;
            
        } catch (error) {
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

    const handleIncomingSignal = useCallback((fromUserId: string, signal: PeerSignalData) => {
        if (!isMounted) {
            return;
        }

        const existingState = peerStatesRef.current.get(fromUserId);
        if (existingState?.isConnected) {
            return;
        }

        let peer = peersRef.current.get(fromUserId);
        
        if (!peer || peer.destroyed) {
            
            peer = createPeer(fromUserId, false, localStream);
            
            if (!peer) {
                return;
            }
            
            setTimeout(() => {
                if (isMounted && peer && !peer.destroyed) {
                    try {
                        peer.signal(signal);
                    } catch (error) {
                    }
                }
            }, 100);
        } else {
            try {
                peer.signal(signal);
            } catch (error) {
                cleanupPeerConnection(fromUserId);
                const newPeer = createPeer(fromUserId, false, localStream);
                if (newPeer) {
                    setTimeout(() => {
                        if (isMounted && newPeer && !newPeer.destroyed) {
                            try {
                                newPeer.signal(signal);
                            } catch (retryError) {
                            }
                        }
                    }, 200);
                }
            }
        }
    }, [createPeer, localStream, isMounted, cleanupPeerConnection]);

    useEffect(() => {
        return () => {
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
