
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
    const lastSceneJSON = useRef<string | null>(JSON.stringify(initialScene));

    // Fonction pour récupérer le snapshot initial
    useEffect(() => {
        const fetchInitialScene = async () => {
            console.log('🎨 [TB SYNC] 1. useEffect: Tentative de chargement de la scène initiale depuis l\'API...');
            try {
                const response = await fetch(`/api/session/${sessionId}/sync`);
                if (response.ok) {
                    const data: ExcalidrawScene | null = await response.json();
                    if (data) {
                        const sceneJSON = JSON.stringify(data);
                        if (sceneJSON !== lastSceneJSON.current) {
                            console.log('🎨 [TB SYNC] 2. ✅ Scène initiale chargée et différente. Mise à jour de l\'état.');
                            setSceneData(data);
                            lastSceneJSON.current = sceneJSON;
                        } else {
                            console.log('🎨 [TB SYNC] 2. 🤷‍♂️ Scène initiale chargée mais identique. Aucune mise à jour.');
                        }
                    } else {
                         console.log('🎨 [TB SYNC] 2. 텅 Scène initiale vide reçue de l\'API.');
                    }
                }
            } catch (error) {
                console.error("❌ [TB SYNC] Erreur lors de la récupération de la scène initiale:", error);
            }
        };

        if (!initialScene) {
             fetchInitialScene();
        } else {
            console.log('🎨 [TB SYNC] 1. useEffect: Scène initiale déjà fournie, pas de fetch.');
        }
    }, [sessionId]);

    // Effet pour l'abonnement Pusher
    useEffect(() => {
        console.log('🔌 [TB SYNC] 3. useEffect: Initialisation de l\'abonnement Pusher.');
        const pusherClient = getPusherClient();
        const channelName = `presence-session-${sessionId}`;
        const channel = pusherClient.subscribe(channelName);

        const handleUpdate = (data: { sceneData: ExcalidrawScene, senderId: string }) => {
            if (data.senderId === pusherClient.connection.socket_id) {
                console.log('➡️ [TB SYNC] 4a. Mise à jour Pusher ignorée (propre émission).');
                return;
            };
            
            const newSceneJSON = JSON.stringify(data.sceneData);
            if (newSceneJSON !== lastSceneJSON.current) {
                console.log('🎨 [TB SYNC] 4b. ✅ Mise à jour Pusher reçue et différente. Mise à jour de l\'état.');
                setSceneData(data.sceneData);
                lastSceneJSON.current = newSceneJSON;
            } else {
                console.log('🎨 [TB SYNC] 4b. 🤷‍♂️ Mise à jour Pusher reçue mais identique. Aucune mise à jour.');
            }
        };
        
        channel.bind(WHITEBOARD_UPDATE_EVENT, handleUpdate);

        return () => {
            console.log('🔌 [TB SYNC] 8. Nettoyage: Désabonnement du canal Pusher.');
            channel.unbind(WHITEBOARD_UPDATE_EVENT, handleUpdate);
            pusherClient.unsubscribe(channelName);
             if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [sessionId]);

    const persistScene = useCallback((data: ExcalidrawScene) => {
        console.log('💾 [TB SYNC] 5. persistScene: Appelée par un changement sur le tableau blanc.');
        const pusherClient = getPusherClient();
        const newSceneJSON = JSON.stringify(data);

        // Mise à jour optimiste uniquement si les données changent
        if (newSceneJSON !== lastSceneJSON.current) {
            console.log('🎨 [TB SYNC] 5a. ✅ Changement local détecté. Mise à jour de l\'état optimiste.');
            setSceneData(data);
            lastSceneJSON.current = newSceneJSON;
        } else {
            console.log('🎨 [TB SYNC] 5a. 🤷‍♂️ Changement local non significatif. Pas de mise à jour d\'état.');
        }

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            console.log('📡 [TB SYNC] 6. setTimeout: Envoi des données persistées à l\'API après debounce.');
            fetch(`/api/session/${sessionId}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sceneData: data,
                    senderSocketId: pusherClient.connection.socket_id,
                }),
            }).catch(error => {
                console.error("❌ [TB SYNC] Erreur lors de la synchronisation du tableau blanc:", error);
            });
        }, DEBOUNCE_SAVE_TIME);

    }, [sessionId]);
    
    console.log('🔄 [TB SYNC] 7. Rendu du hook useWhiteboardSync.');
    return {
        sceneData,
        persistScene,
    };
};
