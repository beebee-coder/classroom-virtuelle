// src/hooks/useWhiteboardSync.ts
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { TLEditorSnapshot } from '@tldraw/tldraw';
import { pusherClient } from '../lib/pusher/client';

const WHITEBOARD_UPDATE_EVENT = 'whiteboard-update';
const DEBOUNCE_SAVE_TIME = 200;

export const useWhiteboardSync = (
    sessionId: string,
    initialSnapshot: TLEditorSnapshot | null
) => {
    const [whiteboardSnapshot, setWhiteboardSnapshot] = useState<TLEditorSnapshot | null>(initialSnapshot);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    useEffect(() => {
        const channelName = `presence-session-${sessionId}`;
        const channel = pusherClient.subscribe(channelName);

        const handleUpdate = (data: { snapshot: TLEditorSnapshot, senderId: string }) => {
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

    const persistWhiteboardSnapshot = useCallback((snapshot: TLEditorSnapshot) => {
        setWhiteboardSnapshot(snapshot);

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            fetch(`/api/pusher/whiteboard-update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    snapshot,
                    senderId: pusherClient.connection.socket_id,
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
