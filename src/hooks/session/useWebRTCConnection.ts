
// src/hooks/session/useWebRTCConnection.ts
'use client';

import { useCallback, useRef, useState } from 'react';
import SimplePeer, { Instance as PeerInstance, SignalData } from 'simple-peer';
import { ablyTrigger } from '@/lib/ably/triggers';
import { getSessionChannelName } from '@/lib/ably/channels';
import { AblyEvents } from '@/lib/ably/events';

const PEER_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useWebRTCConnection(sessionId: string, currentUserId: string, localStream: MediaStream | null, isComponentMounted: boolean) {
  const peersRef = useRef<Map<string, PeerInstance>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  
  const sendSignal = useCallback(async (targetUserId: string, signal: SignalData, isReturnSignal: boolean) => {
    try {
      await ablyTrigger(getSessionChannelName(sessionId), AblyEvents.SIGNAL, {
        signal,
        userId: currentUserId,
        target: targetUserId,
        isReturnSignal
      });
    } catch (error) {
      console.error(`❌ [WEBRTC] Erreur d'envoi de signal à ${targetUserId}:`, error);
    }
  }, [sessionId, currentUserId]);

  const cleanupPeerConnection = useCallback((userId: string) => {
    const peer = peersRef.current.get(userId);
    if (peer) {
      peer.destroy();
      peersRef.current.delete(userId);
      setRemoteStreams(prev => {
        const newStreams = new Map(prev);
        newStreams.delete(userId);
        return newStreams;
      });
    }
  }, []);

  const createPeer = useCallback((targetUserId: string, initiator: boolean, stream: MediaStream): PeerInstance | null => {
    if (!isComponentMounted) return null;
    
    if (peersRef.current.has(targetUserId)) {
      return peersRef.current.get(targetUserId)!;
    }

    const peer = new SimplePeer({
      initiator,
      config: PEER_CONFIG,
      stream: stream,
      trickle: true,
    });
    
    peersRef.current.set(targetUserId, peer);

    peer.on('signal', (signal) => {
      sendSignal(targetUserId, signal, !initiator);
    });

    peer.on('stream', (remoteStream) => {
      if (!isComponentMounted) return;
      setRemoteStreams(prev => new Map(prev).set(targetUserId, remoteStream));
    });

    peer.on('error', (err) => {
      console.error(`❌ [PEER ERROR] - Erreur avec le peer pour ${targetUserId}:`, err);
      cleanupPeerConnection(targetUserId);
    });

    peer.on('close', () => {
      cleanupPeerConnection(targetUserId);
    });

    return peer;
  }, [isComponentMounted, sendSignal, cleanupPeerConnection]);
  
  const handleIncomingSignal = useCallback((fromUserId: string, signal: SignalData, isReturnSignal?: boolean) => {
    if (!isComponentMounted) return;
    
    let peer = peersRef.current.get(fromUserId);
    
    if (!peer) {
      if (isReturnSignal) {
        return;
      }
      if (!localStream) {
        console.warn("⚠️ [WEBRTC] Signal reçu mais le flux local n'est pas prêt. Report.");
        setTimeout(() => handleIncomingSignal(fromUserId, signal, isReturnSignal), 1000);
        return;
      }
      peer = createPeer(fromUserId, false, localStream);
    }
    
    if (peer && !peer.destroyed) {
      try {
        peer.signal(signal);
      } catch (error) {
        console.error(`❌ [SIGNAL ERROR] Erreur lors de l'application du signal de ${fromUserId}:`, error);
      }
    }
  }, [isComponentMounted, createPeer, localStream]);
  
  return { remoteStreams, createPeer, handleIncomingSignal, cleanupPeerConnection };
}
