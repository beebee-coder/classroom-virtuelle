// src/hooks/useWhiteboardSync.ts
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { TLStoreSnapshot } from '@tldraw/tldraw';
import { pusherClient } from '../lib/pusher/client';

const WHITEBOARD_UPDATE_EVENT = 'whiteboard-update';
const DEBOUNCE_SAVE_TIME = 200;

export const useWhiteboardSync = (
    sessionId: string,
    initialSnapshot: TLStoreSnapshot | null
) => {
    const [whiteboardSnapshot, setWhiteboardSnapshot] = useState<TLStoreSnapshot | null>(initialSnapshot);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Fonction pour récupérer le snapshot initial
    useEffect(() => {
        const fetchInitialSnapshot = async () => {
            try {
                const response = await fetch(`/api/session/${sessionId}/sync`);
                if (response.ok) {
                    const snapshot = await response.json();
                    if (snapshot) {
                        setWhiteboardSnapshot(snapshot);
                        console.log('🎨 [TB SYNC] - Snapshot initial chargé depuis l\'API.');
                    }
                }
            } catch (error) {
                console.error("Erreur lors de la récupération du snapshot initial:", error);
            }
        };

        if (!initialSnapshot) {
             fetchInitialSnapshot();
        }
    }, [sessionId, initialSnapshot]);

    // Effet pour l'abonnement Pusher
    useEffect(() => {
        const channelName = `presence-session-${sessionId}`;
        const channel = pusherClient.subscribe(channelName);

        const handleUpdate = (data: { snapshot: TLStoreSnapshot, senderId: string }) => {
            // Ignorer les mises à jour que nous avons nous-mêmes envoyées
            if (data.senderId === pusherClient.connection.socket_id) return;
            setWhiteboardSnapshot(data.snapshot);
        };
        
        channel.bind(WHITEBOARD_UPDATE_EVENT, handleUpdate);

        return () => {
            channel.unbind(WHITEBOARD_UPDATE_EVENT, handleUpdate);
            pusherClient.unsubscribe(channelName);
             if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [sessionId]);

    // Fonction pour persister les changements via l'API centralisée
    const persistWhiteboardSnapshot = useCallback((snapshot: TLStoreSnapshot) => {
        setWhiteboardSnapshot(snapshot);

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            fetch(`/api/session/${sessionId}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    snapshot,
                    senderSocketId: pusherClient.connection.socket_id, // Important pour l'exclusion
                }),
            }).catch(error => {
                console.error("Erreur lors de la synchronisation du tableau blanc:", error);
            });
        }, DEBOUNCE_SAVE_TIME);

    }, [sessionId]);
    
    return {
        whiteboardSnapshot,
        persistWhiteboardSnapshot,
    };
};
