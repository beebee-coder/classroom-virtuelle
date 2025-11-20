// src/hooks/session/useWebRTCConnection.ts
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
        if (!isMounted) return undefined;

        const existingState = peerStatesRef.current.get(targetUserId);
        if (existingState?.isConnected) return undefined;

        if (pendingConnectionsRef.current.has(targetUserId)) return undefined;

        console.log(`🤝 [PEER CREATION] - Création du peer pour: ${targetUserId}. Initiateur: ${initiator}`);

        try {
            pendingConnectionsRef.current.add(targetUserId);
            peerStatesRef.current.set(targetUserId, { 
                isConnected: false, isConnecting: true, connectionAttempts: (existingState?.connectionAttempts || 0) + 1,
                lastAttempt: Date.now(), signalCount: 0, hasReceivedStream: false
            });

            const peer = new SimplePeer({
                initiator,
                trickle: true,
                stream: stream || undefined,
                config: { iceServers: WEBRTC_CONFIG.ICE_SERVERS }
            });

            peer.on('signal', (signal: PeerSignalData) => {
                if (!isMounted || peer.destroyed) return;
                console.log(`📡 [PEER SIGNAL] - Envoi du signal de ${currentUserId} à ${targetUserId}`);
                signalViaAPI({
                    channelName: getSessionChannelName(sessionId),
                    userId: currentUserId,
                    target: targetUserId,
                    signal,
                    isReturnSignal: !initiator
                });
            });

            peer.on('stream', (remoteStream: MediaStream) => {
                if (!isMounted) return;
                console.log(`🎉 [PEER STREAM] - Stream reçu de ${targetUserId}`);
                setRemoteStreams(prev => new Map(prev).set(targetUserId, remoteStream));
                peerStatesRef.current.set(targetUserId, { ...peerStatesRef.current.get(targetUserId)!, isConnected: true, isConnecting: false, hasReceivedStream: true });
                pendingConnectionsRef.current.delete(targetUserId);
            });

            peer.on('connect', () => {
                peerStatesRef.current.set(targetUserId, { ...peerStatesRef.current.get(targetUserId)!, isConnected: true, isConnecting: false });
                pendingConnectionsRef.current.delete(targetUserId);
            });

            peer.on('error', (err: Error) => {
                console.error(`❌ [PEER ERROR] - Erreur avec ${targetUserId}:`, err);
                cleanupPeerConnection(targetUserId);
            });
            
            peer.on('close', () => {
                console.log(`🚪 [PEER CLOSE] - Connexion fermée pour ${targetUserId}`);
                cleanupPeerConnection(targetUserId);
            });

            const existingPeer = peersRef.current.get(targetUserId);
            if (existingPeer && !existingPeer.destroyed) {
                existingPeer.destroy();
            }
            peersRef.current.set(targetUserId, peer);
            return peer;
        } catch (error) {
            console.error('❌ [PEER CREATION] - Erreur lors de la création:', error);
            pendingConnectionsRef.current.delete(targetUserId);
            return undefined;
        }
    }, [sessionId, currentUserId, cleanupPeerConnection, isMounted]);

    useEffect(() => {
        return () => {
            // Nettoyage au démontage du hook
            Array.from(peersRef.current.keys()).forEach(cleanupPeerConnection);
        };
    }, [cleanupPeerConnection]);

    return {
        remoteStreams,
        peersRef,
        createPeer,
        cleanupPeerConnection
    };
}
