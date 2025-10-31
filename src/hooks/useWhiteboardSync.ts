// src/hooks/useWhiteboardSync.ts
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ExcalidrawScene } from '@/types';
import { getPusherClient } from '@/lib/pusher/client';

const WHITEBOARD_UPDATE_EVENT = 'whiteboard-update';
const DEBOUNCE_SAVE_TIME = 200;

export const useWhiteboardSync = (
    sessionId: string,
    initialScene: ExcalidrawScene | null
) => {
    const [sceneData, setSceneData] = useState<ExcalidrawScene | null>(initialScene);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Fonction pour récupérer le snapshot initial
    useEffect(() => {
        const fetchInitialScene = async () => {
            try {
                const response = await fetch(`/api/session/${sessionId}/sync`);
                if (response.ok) {
                    const data: ExcalidrawScene | null = await response.json();
                    if (data) {
                        setSceneData(data);
                        console.log('🎨 [TB SYNC] - Scène initiale chargée depuis l\'API.');
                    }
                }
            } catch (error) {
                console.error("Erreur lors de la récupération de la scène initiale:", error);
            }
        };

        if (!initialScene) {
             fetchInitialScene();
        }
    }, [sessionId, initialScene]);

    // Effet pour l'abonnement Pusher
    useEffect(() => {
        const pusherClient = getPusherClient();
        const channelName = `presence-session-${sessionId}`;
        const channel = pusherClient.subscribe(channelName);

        const handleUpdate = (data: { sceneData: ExcalidrawScene, senderId: string }) => {
            if (data.senderId === pusherClient.connection.socket_id) return;
            setSceneData(data.sceneData);
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

    const persistScene = useCallback((data: ExcalidrawScene) => {
        const pusherClient = getPusherClient();
        setSceneData(data);

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            fetch(`/api/session/${sessionId}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sceneData: data,
                    senderSocketId: pusherClient.connection.socket_id,
                }),
            }).catch(error => {
                console.error("Erreur lors de la synchronisation du tableau blanc:", error);
            });
        }, DEBOUNCE_SAVE_TIME);

    }, [sessionId]);
    
    return {
        sceneData,
        persistScene,
    };
};
