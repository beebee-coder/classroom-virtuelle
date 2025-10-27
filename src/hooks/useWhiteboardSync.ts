// src/hooks/useWhiteboardSync.ts
'use client';

import { useState, useCallback, RefObject, useEffect, useRef } from 'react';
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
    
    // Références pour s'assurer que les logs n'apparaissent qu'une fois
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
            } else if (message.type === CONTROLLER_CHANGE_EVENT_TYPE) {
                const newControllerId = (message.payload as { controllerId: string }).controllerId;
                setWhiteboardControllerId(newControllerId);
            }
        } catch (error) {
            // Ignorer les erreurs de parsing pour les messages non-JSON
        }
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
    
    const broadcastControllerChange = useCallback((newControllerId: string) => {
        if (peersRef.current) {
            console.log(`👑 [TB CONTRÔLE] - Diffusion du changement de contrôleur vers: ${newControllerId}`);
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
        setWhiteboardControllerId,
        handleWhiteboardUpdate,
        broadcastWhiteboardUpdate,
        broadcastControllerChange,
    };
};
