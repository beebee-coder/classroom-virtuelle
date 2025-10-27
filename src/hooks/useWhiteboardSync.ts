// src/hooks/useWhiteboardSync.ts
'use client';

import { useState, useCallback, RefObject, useEffect, useRef } from 'react';
import { TLEditorSnapshot } from '@tldraw/tldraw';
import type { Instance as PeerInstance } from 'simple-peer';
import { pusherClient } from '../lib/pusher/client';

const WHITEBOARD_EVENT_TYPE = 'whiteboard-update';
const CONTROLLER_CHANGE_EVENT_TYPE = 'whiteboard-controller-change';

interface WhiteboardMessage {
    type: string;
    payload: TLEditorSnapshot | { controllerId: string };
}

export const useWhiteboardSync = (
    initialControllerId: string,
    peersRef: RefObject<Map<string, PeerInstance>>,
    sessionId: string // Ajout de l'ID de session pour le canal Pusher
) => {
    const [whiteboardSnapshot, setWhiteboardSnapshot] = useState<TLEditorSnapshot | null>(null);
    const [whiteboardControllerId, setWhiteboardControllerId] = useState<string>(initialControllerId);
    
    const hasLoggedEmission = useRef(false);
    const hasLoggedReception = useRef(false);

    const handleWhiteboardUpdate = useCallback((data: any) => {
        try {
            const message: WhiteboardMessage = JSON.parse(data.toString());

            if (message.type === WHITEBOARD_EVENT_TYPE) {
                if (!hasLoggedReception.current) {
                    console.log('📡 [TB RÉCEPTION] - Première donnée de tableau blanc reçue par un observateur.');
                    hasLoggedReception.current = true;
                }
                setWhiteboardSnapshot(message.payload as TLEditorSnapshot);
            }
        } catch (error) {
            // Ignorer les erreurs de parsing pour les messages non-JSON
        }
    }, []);

    // Gérer les changements de contrôleur reçus via Pusher
    const handleControllerChange = useCallback((data: { controllerId: string }) => {
        console.log(`👑 [TB CONTRÔLE] - Changement de contrôleur reçu via Pusher: ${data.controllerId}`);
        setWhiteboardControllerId(data.controllerId);
    }, []);

    const broadcastWhiteboardUpdate = useCallback((snapshot: TLEditorSnapshot) => {
        if (peersRef.current) {
            if (!hasLoggedEmission.current) {
                console.log('🎨 [TB ÉMISSION] - Première donnée de tableau blanc envoyée par le contrôleur.');
                hasLoggedEmission.current = true;
            }
            const message: WhiteboardMessage = {
                type: WHITEBOARD_EVENT_TYPE,
                payload: snapshot
            };
            const messageString = JSON.stringify(message);
            
            for (const peer of peersRef.current.values()) {
                if (peer.connected) {
                    peer.send(messageString);
                }
            }
        }
    }, [peersRef]);
    
    // La diffusion du changement de contrôleur se fait via une action serveur et Pusher
    // pour garantir que tout le monde reçoit le message, même les nouveaux arrivants.
    const broadcastControllerChange = useCallback(async (newControllerId: string) => {
        console.log(`👑 [TB CONTRÔLE] - Demande de changement de contrôleur vers: ${newControllerId}`);
        // L'appel API déclenchera l'événement Pusher pour tous les clients
        try {
            await fetch(`/api/session/${sessionId}/whiteboard-controller`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ controllerId: newControllerId }),
            });
        } catch (error) {
            console.error("Erreur lors de la diffusion du changement de contrôleur:", error);
        }
    }, [sessionId]);

    useEffect(() => {
        const peers = peersRef.current;
        if (peers) {
            peers.forEach(peer => {
                peer.on('data', handleWhiteboardUpdate);
            });
        }
        
        const channelName = `presence-session-${sessionId}`;
        const channel = pusherClient.subscribe(channelName);
        channel.bind('whiteboard-controller-update', handleControllerChange);

        return () => {
            if (peers) {
                peers.forEach(peer => {
                    peer.off('data', handleWhiteboardUpdate);
                });
            }
            channel.unbind('whiteboard-controller-update', handleControllerChange);
            pusherClient.unsubscribe(channelName);
        };
    }, [peersRef, handleWhiteboardUpdate, sessionId, handleControllerChange]);

    return {
        whiteboardSnapshot,
        setWhiteboardSnapshot,
        whiteboardControllerId,
        setWhiteboardControllerId,
        handleWhiteboardUpdate,
        broadcastWhiteboardUpdate,
        broadcastControllerChange,
    };
};
