// src/hooks/useWhiteboardSync.ts
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { TLEditorSnapshot } from '@tldraw/tldraw';
import { pusherClient } from '../lib/pusher/client';

const WHITEBOARD_UPDATE_EVENT = 'whiteboard-update-event';
const DEBOUNCE_SAVE_TIME = 2000; // 2 secondes

export const useWhiteboardSync = (
    sessionId: string,
    initialControllerId: string
) => {
    const [whiteboardSnapshot, setWhiteboardSnapshot] = useState<TLEditorSnapshot | null>(null);
    const [whiteboardControllerId, setWhiteboardControllerId] = useState<string>(initialControllerId);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Effet pour récupérer le snapshot initial au chargement
    useEffect(() => {
        const fetchInitialSnapshot = async () => {
            try {
                const response = await fetch(`/api/session/${sessionId}/sync`);
                if (response.ok) {
                    const snapshot = await response.json();
                    if (snapshot) {
                        setWhiteboardSnapshot(snapshot);
                        console.log('🎨 [TB SYNC] - Snapshot initial chargé depuis Redis.');
                    }
                }
            } catch (error) {
                console.error("Erreur lors de la récupération du snapshot initial:", error);
            }
        };
        fetchInitialSnapshot();
    }, [sessionId]);

    // Effet pour écouter les mises à jour via Pusher
    useEffect(() => {
        const channelName = `presence-session-${sessionId}`;
        const channel = pusherClient.subscribe(channelName);

        const handleUpdate = (data: { snapshot: TLEditorSnapshot }) => {
            setWhiteboardSnapshot(data.snapshot);
        };
        
        channel.bind(WHITEBOARD_UPDATE_EVENT, handleUpdate);
        channel.bind('whiteboard-controller-update', (data: { controllerId: string }) => {
            setWhiteboardControllerId(data.controllerId);
        });

        return () => {
            channel.unbind(WHITEBOARD_UPDATE_EVENT, handleUpdate);
            channel.unbind('whiteboard-controller-update');
            pusherClient.unsubscribe(channelName);
        };
    }, [sessionId]);

    // Callback pour persister/diffuser le snapshot
    const persistWhiteboardSnapshot = useCallback((snapshot: TLEditorSnapshot) => {
        // Mettre à jour l'état local immédiatement pour une réactivité optimale
        setWhiteboardSnapshot(snapshot);

        // Annuler le timeout précédent pour le débouclage
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Définir un nouveau timeout pour envoyer les données au serveur
        saveTimeoutRef.current = setTimeout(() => {
            fetch(`/api/session/${sessionId}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    snapshot,
                    source: pusherClient.connection.socket_id, // Exclure l'expéditeur de la diffusion Pusher
                }),
            }).catch(error => {
                console.error("Erreur lors de la synchronisation du tableau blanc:", error);
            });
        }, DEBOUNCE_SAVE_TIME);

    }, [sessionId]);
    
     const broadcastControllerChange = useCallback(async (newControllerId: string) => {
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

    return {
        whiteboardSnapshot,
        setWhiteboardSnapshot,
        whiteboardControllerId,
        setWhiteboardControllerId,
        persistWhiteboardSnapshot,
        broadcastControllerChange,
    };
};
