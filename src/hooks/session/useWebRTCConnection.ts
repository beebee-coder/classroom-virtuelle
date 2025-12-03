// src/hooks/session/useWebRTCConnection.ts - VERSION REFAITE ET STABILISÉE
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { Instance as PeerInstance, SignalData as PeerSignalData } from 'simple-peer';
import SimplePeer from 'simple-peer';
import { getSessionChannelName } from '@/lib/ably/channels';
import { ablyTrigger } from '@/lib/ably/triggers';
import { AblyEvents } from '@/lib/ably/events';

// Configuration pour la robustesse de la connexion
const WEBRTC_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ]
};

export function useWebRTCConnection(
    sessionId: string, 
    currentUserId: string, 
    localStream: MediaStream | null, 
    isComponentMounted: boolean,
    onStreamConnected: (userId: string, stream: MediaStream) => void,
    onStreamDisconnected: (userId: string) => void
) {
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const peersRef = useRef<Map<string, PeerInstance>>(new Map());
    const signalQueueRef = useRef<Map<string, PeerSignalData[]>>(new Map());

    // Fonction de nettoyage propre pour un utilisateur spécifique
    const cleanupPeerConnection = useCallback((userId: string) => {
        console.log(`🧹 [WebRTC] Nettoyage de la connexion pour ${userId}`);
        const peer = peersRef.current.get(userId);
        if (peer) {
            peer.destroy();
        }
        peersRef.current.delete(userId);
        signalQueueRef.current.delete(userId);
        setRemoteStreams(prev => {
            const newMap = new Map(prev);
            if (newMap.has(userId)) {
                newMap.get(userId)?.getTracks().forEach(track => track.stop());
                newMap.delete(userId);
                onStreamDisconnected(userId);
                return newMap;
            }
            return prev;
        });
    }, [onStreamDisconnected]);

    // Création d'une nouvelle connexion pair-à-pair
    const createPeer = useCallback((targetUserId: string, initiator: boolean, stream: MediaStream | null) => {
        if (!isComponentMounted) return;

        // Si un pair existe déjà (même en cours de destruction), on le nettoie avant d'en créer un nouveau
        if (peersRef.current.has(targetUserId)) {
            console.log(`🔄 [WebRTC] Un pair existe déjà pour ${targetUserId}, nettoyage avant recréation.`);
            cleanupPeerConnection(targetUserId);
        }

        console.log(`🎯 [WebRTC] Création d'un nouveau peer ${initiator ? 'initiateur' : 'récepteur'} pour ${targetUserId}`);

        const peer = new SimplePeer({
            initiator,
            trickle: true,
            stream: stream || undefined,
            config: WEBRTC_CONFIG,
        });

        // Envoi des signaux via Ably
        peer.on('signal', (signal: PeerSignalData) => {
            if (!isComponentMounted) return;
            console.log(`📤 [WebRTC] Envoi du signal ${signal.type} à ${targetUserId}`);
            ablyTrigger(getSessionChannelName(sessionId), AblyEvents.SIGNAL, {
                userId: currentUserId,
                target: targetUserId,
                signal: signal,
            });
        });

        // Réception d'un flux média distant
        peer.on('stream', (remoteStream: MediaStream) => {
            if (!isComponentMounted) return;
            console.log(`📥 [WebRTC] Flux média reçu de ${targetUserId}`);
            setRemoteStreams(prev => new Map(prev).set(targetUserId, remoteStream));
            onStreamConnected(targetUserId, remoteStream);
        });

        // Confirmation de la connexion
        peer.on('connect', () => {
            console.log(`🔗 [WebRTC] Connexion établie avec ${targetUserId}`);
        });

        // Gestion des erreurs
        peer.on('error', (err: Error) => {
            console.error(`❌ [WebRTC] Erreur de connexion avec ${targetUserId}:`, err);
            cleanupPeerConnection(targetUserId); // Nettoyer en cas d'erreur
        });

        // Gestion de la fermeture
        peer.on('close', () => {
            console.log(`🔒 [WebRTC] Connexion fermée avec ${targetUserId}`);
            cleanupPeerConnection(targetUserId);
        });

        peersRef.current.set(targetUserId, peer);
        
        // Traiter les signaux en attente pour ce pair
        const queuedSignals = signalQueueRef.current.get(targetUserId);
        if (queuedSignals) {
            console.log(`📬 [WebRTC] Traitement de ${queuedSignals.length} signaux en attente pour ${targetUserId}`);
            queuedSignals.forEach(signal => peer.signal(signal));
            signalQueueRef.current.delete(targetUserId);
        }

        return peer;

    }, [isComponentMounted, sessionId, currentUserId, cleanupPeerConnection, onStreamConnected]);

    // Traitement des signaux entrants
    const handleIncomingSignal = useCallback((fromUserId: string, signal: PeerSignalData) => {
        if (!isComponentMounted) return;

        let peer = peersRef.current.get(fromUserId);
        
        // Si le pair n'existe pas encore, on crée un récepteur et on met le signal en file d'attente
        if (!peer) {
            console.log(`⏳ [WebRTC] Peer pour ${fromUserId} non trouvé. Mise en file d'attente du signal.`);
            if (!signalQueueRef.current.has(fromUserId)) {
                signalQueueRef.current.set(fromUserId, []);
            }
            signalQueueRef.current.get(fromUserId)!.push(signal);
            return;
        }

        // Si le pair existe, on lui passe le signal
        console.log(`📨 [WebRTC] Application du signal de ${fromUserId}`);
        peer.signal(signal);

    }, [isComponentMounted]);

    // Nettoyage au démontage du composant
    useEffect(() => {
        return () => {
            console.log('🧹 [WebRTC] Nettoyage de toutes les connexions au démontage du hook.');
            Array.from(peersRef.current.keys()).forEach(cleanupPeerConnection);
        };
    }, [cleanupPeerConnection]);

    return {
        remoteStreams,
        createPeer,
        cleanupPeerConnection,
        handleIncomingSignal
    };
}
