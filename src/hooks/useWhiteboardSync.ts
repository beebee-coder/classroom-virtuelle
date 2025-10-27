// src/hooks/useWhiteboardSync.ts
'use client';

import { useState, useCallback, RefObject } from 'react';
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
    const [whiteboardControllerId, setWhiteboardControllerId] = useState<string | null>(initialControllerId);

    // Fonction pour gérer les messages entrants du data channel
    const handleWhiteboardUpdate = useCallback((data: any) => {
        try {
            const message: WhiteboardMessage = JSON.parse(data.toString());

            if (message.type === WHITEBOARD_EVENT_TYPE) {
                setWhiteboardSnapshot(message.payload as TLEditorSnapshot);
            } else if (message.type === CONTROLLER_CHANGE_EVENT_TYPE) {
                setWhiteboardControllerId((message.payload as { controllerId: string }).controllerId);
            }
        } catch (error) {
            console.error('Erreur lors du traitement du message du tableau blanc:', error);
        }
    }, []);

    // Fonction pour diffuser les mises à jour du tableau blanc à tous les pairs
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

    // Fonction pour diffuser le changement de contrôleur
    const broadcastControllerChange = useCallback((newControllerId: string) => {
        if (peersRef.current) {
            const message: WhiteboardMessage = {
                type: CONTROLLER_CHANGE_EVENT_TYPE,
                payload: { controllerId: newControllerId }
            };
             const messageString = JSON.stringify(message);

            setWhiteboardControllerId(newControllerId); // Mise à jour locale immédiate

            for (const peer of peersRef.current.values()) {
                if (peer.connected) {
                    peer.send(messageString);
                }
            }
        }
    }, [peersRef]);

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
