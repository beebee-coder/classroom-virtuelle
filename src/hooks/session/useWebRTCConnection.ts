// src/hooks/session/useWebRTCConnection.ts
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { Instance as PeerInstance, SignalData as PeerSignalData } from 'simple-peer';
import SimplePeer from 'simple-peer';
import { getSessionChannelName } from '@/lib/ably/channels';
import { ablyTrigger } from '@/lib/ably/triggers';
import { AblyEvents } from '@/lib/ably/events';


const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
];

export function useWebRTCConnection(sessionId: string, currentUserId: string, localStream: MediaStream | null, isMounted: boolean) {
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const peersRef = useRef<Map<string, PeerInstance>>(new Map());

    const cleanupPeerConnection = useCallback((userId: string) => {
        console.log(`[PEER CLEANUP] - Nettoyage de la connexion pour ${userId}`);
        const peer = peersRef.current.get(userId);
        if (peer) {
            peer.destroy();
            peersRef.current.delete(userId);
        }
        setRemoteStreams(prev => {
            const newMap = new Map(prev);
            if (newMap.has(userId)) {
                console.log(`[STREAM CLEANUP] - Suppression du stream distant pour ${userId}`);
                newMap.delete(userId);
                return newMap;
            }
            return prev;
        });
    }, []);

    const signalViaAbly = useCallback(async (targetUserId: string, signal: PeerSignalData) => {
        if (!isMounted) return;
        try {
            await ablyTrigger(getSessionChannelName(sessionId), AblyEvents.SIGNAL, {
                userId: currentUserId,
                target: targetUserId,
                signal,
            });
             console.log(`[SIGNAL] - Signal ${signal.type} envoyé à ${targetUserId}`);
        } catch (error) {
            console.error('[SIGNAL] - Erreur d\'envoi du signal via Ably:', error);
        }
    }, [sessionId, currentUserId, isMounted]);

    const createPeer = useCallback((targetUserId: string, initiator: boolean, stream: MediaStream | null): PeerInstance | undefined => {
        if (!isMounted) {
            console.warn(`[PEER CREATION] - Tentative de création de peer alors que le composant est démonté pour ${targetUserId}`);
            return;
        }
        
        console.log(`[PEER CREATION] - Tentative de création de peer ${initiator ? 'initiateur' : 'répondeur'} pour ${targetUserId}`);

        // Détruire l'ancien peer s'il existe pour éviter les conflits
        if (peersRef.current.has(targetUserId)) {
            console.log(`[PEER CREATION] - Un peer existant pour ${targetUserId} va être détruit.`);
            peersRef.current.get(targetUserId)?.destroy();
        }

        try {
            const peer = new SimplePeer({
                initiator,
                trickle: true,
                stream: stream || undefined,
                config: { iceServers: ICE_SERVERS },
            });

            peer.on('signal', (signal) => {
                if (isMounted) signalViaAbly(targetUserId, signal);
            });

            peer.on('stream', (remoteStream) => {
                console.log(`[STREAM] - Stream reçu de ${targetUserId}`);
                if (isMounted) {
                    setRemoteStreams(prev => new Map(prev).set(targetUserId, remoteStream));
                }
            });
             peer.on('connect', () => {
                console.log(`[PEER CONNECT] - Connexion WebRTC établie avec ${targetUserId}`);
            });
            peer.on('error', (err) => {
                console.error(`[PEER ERROR] - Erreur avec ${targetUserId}:`, err);
                if (isMounted) {
                    cleanupPeerConnection(targetUserId); // Nettoyage en cas d'erreur
                }
            });
            peer.on('close', () => {
                console.log(`[PEER CLOSE] - Connexion fermée avec ${targetUserId}`);
                if (isMounted) {
                    cleanupPeerConnection(targetUserId);
                }
            });

            peersRef.current.set(targetUserId, peer);
            return peer;
        } catch (error) {
             console.error(`[PEER CREATION] - Erreur lors de la création du peer pour ${targetUserId}:`, error);
        }
        
    }, [isMounted, signalViaAbly, cleanupPeerConnection]);

    const handleIncomingSignal = useCallback((fromUserId: string, signal: PeerSignalData) => {
        if (!isMounted) return;
        
        console.log(`[SIGNAL IN] - Signal reçu de ${fromUserId}`);

        let peer = peersRef.current.get(fromUserId);
        
        if (!peer) {
            console.log(`[SIGNAL IN] - Aucun peer existant pour ${fromUserId}, création d'un nouveau (répondeur).`);
            peer = createPeer(fromUserId, false, localStream);
        }

        if (peer && !peer.destroyed) {
            try {
                peer.signal(signal);
                 console.log(`[SIGNAL IN] - Signal appliqué avec succès pour ${fromUserId}`);
            } catch (err) {
                 console.error(`[SIGNAL IN] - Erreur à l'application du signal pour ${fromUserId}:`, err);
                 // En cas d'erreur de signalisation (ex: état invalide), il peut être nécessaire de recréer le peer.
                 cleanupPeerConnection(fromUserId);
                 const newPeer = createPeer(fromUserId, false, localStream);
                 if (newPeer) {
                    newPeer.signal(signal);
                 }
            }
        } else {
            console.warn(`[SIGNAL IN] - Peer pour ${fromUserId} est détruit ou non défini, impossible d'appliquer le signal.`);
        }
    }, [localStream, createPeer, isMounted, cleanupPeerConnection]);

    // Nettoyage au démontage du composant
    useEffect(() => {
        return () => {
            console.log("[WEBRTC CLEANUP] - Nettoyage de toutes les connexions WebRTC");
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
