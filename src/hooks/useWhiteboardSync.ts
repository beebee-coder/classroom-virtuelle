// src/hooks/useWhiteboardSync.ts
'use client';

import { useState, useCallback, RefObject, useEffect } from 'react';
import { TLEditorSnapshot } from '@tldraw/tldraw';
import type { Instance as PeerInstance } from 'simple-peer';

const WHITEBOARD_EVENT_TYPE = 'whiteboard-update';
const CONTROLLER_CHANGE_EVENT_TYPE = 'whiteboard-controller-change';

interface WhiteboardMessage {
    type: string;
    payload: TLEditorSnapshot | { controllerId: string };
}

export const useWhiteboardSync = (
    initialControllerId: string,
    peersRef: RefObject<Map<string, PeerInstance>>
) => {
    const [whiteboardSnapshot, setWhiteboardSnapshot] = useState<TLEditorSnapshot | null>(null);
    const [whiteboardControllerId, setWhiteboardControllerId] = useState<string>(initialControllerId);

    const handleWhiteboardUpdate = useCallback((data: any) => {
        try {
            const message: WhiteboardMessage = JSON.parse(data.toString());

            if (message.type === WHITEBOARD_EVENT_TYPE) {
                setWhiteboardSnapshot(message.payload as TLEditorSnapshot);
            } else if (message.type === CONTROLLER_CHANGE_EVENT_TYPE) {
                // MISE À JOUR : s'assurer que tout le monde met à jour son contrôleur
                const newControllerId = (message.payload as { controllerId: string }).controllerId;
                setWhiteboardControllerId(newControllerId);
            }
        } catch (error) {
            console.error('Erreur lors du traitement du message du tableau blanc:', error);
        }
    }, []);

    const broadcastWhiteboardUpdate = useCallback((snapshot: TLEditorSnapshot) => {
        if (peersRef.current) {
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
    
    const broadcastControllerChange = useCallback((newControllerId: string) => {
        if (peersRef.current) {
            const message: WhiteboardMessage = {
                type: CONTROLLER_CHANGE_EVENT_TYPE,
                payload: { controllerId: newControllerId }
            };
             const messageString = JSON.stringify(message);

            setWhiteboardControllerId(newControllerId); 

            for (const peer of peersRef.current.values()) {
                if (peer.connected) {
                    peer.send(messageString);
                }
            }
        }
    }, [peersRef]);

    // Attacher/détacher le gestionnaire d'événements 'data' aux pairs
    useEffect(() => {
        const peers = peersRef.current;
        if (peers) {
            peers.forEach(peer => {
                peer.on('data', handleWhiteboardUpdate);
            });
        }
        return () => {
            if (peers) {
                peers.forEach(peer => {
                    peer.off('data', handleWhiteboardUpdate);
                });
            }
        };
    }, [peersRef, handleWhiteboardUpdate]);

    return {
        whiteboardSnapshot,
        setWhiteboardSnapshot,
        whiteboardControllerId,
        setWhiteboardControllerId, // Exposer pour les mises à jour locales
        handleWhiteboardUpdate,
        broadcastWhiteboardUpdate,
        broadcastControllerChange,
    };
};
