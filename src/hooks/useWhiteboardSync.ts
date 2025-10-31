// src/hooks/useWhiteboardSync.ts
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ExcalidrawScene } from '@/types';
import { getPusherClient } from '@/lib/pusher/client';

const WHITEBOARD_UPDATE_EVENT = 'whiteboard-update';
const DEBOUNCE_SAVE_TIME = 500; // ⚠️ CORRECTION : Augmenter le debounce

export const useWhiteboardSync = (
    sessionId: string,
    initialScene: ExcalidrawScene | null
) => {
    const [sceneData, setSceneData] = useState<ExcalidrawScene | null>(initialScene);
    const [isLoading, setIsLoading] = useState(!initialScene);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSceneJSON = useRef<string | null>(initialScene ? JSON.stringify(initialScene) : null);
    const hasFetchedInitial = useRef(false);
    const isUpdatingFromExternal = useRef(false); // ⚠️ CORRECTION : Nouvelle référence

    // ⚠️ CORRECTION : Effet simplifié pour le chargement initial
    useEffect(() => {
        if (hasFetchedInitial.current || initialScene) return;

        const fetchInitialScene = async () => {
            console.log('🎨 [TB SYNC] Chargement de la scène initiale...');
            setIsLoading(true);
            
            try {
                const response = await fetch(`/api/session/${sessionId}/sync`);
                if (response.ok) {
                    const data: ExcalidrawScene | null = await response.json();
                    if (data) {
                        const sceneJSON = JSON.stringify(data);
                        if (sceneJSON !== lastSceneJSON.current) {
                            console.log('🎨 [TB SYNC] Scène initiale chargée');
                            isUpdatingFromExternal.current = true; // ⚠️ CORRECTION : Marquer comme mise à jour externe
                            setSceneData(data);
                            lastSceneJSON.current = sceneJSON;
                        }
                    }
                }
            } catch (error) {
                console.error("❌ [TB SYNC] Erreur lors du chargement initial:", error);
            } finally {
                setIsLoading(false);
                hasFetchedInitial.current = true;
            }
        };

        fetchInitialScene();
    }, [sessionId, initialScene]);

    // ⚠️ CORRECTION : Effet Pusher avec protection contre les boucles
    useEffect(() => {
        console.log('🔌 [TB SYNC] Initialisation de l\'abonnement Pusher');
        const pusherClient = getPusherClient();
        const channelName = `presence-session-${sessionId}`;
        
        if (pusherClient.channel(channelName)) {
            console.log('🔌 [TB SYNC] Déjà abonné, skip');
            return;
        }

        const channel = pusherClient.subscribe(channelName);

        const handleUpdate = (data: { sceneData: ExcalidrawScene, senderId: string }) => {
            // ⚠️ CORRECTION : Vérifications renforcées
            if (data.senderId === pusherClient.connection.socket_id) {
                console.log('➡️ [TB SYNC] Mise à jour ignorée (propre émission)');
                return;
            };
            
            const newSceneJSON = JSON.stringify(data.sceneData);
            if (newSceneJSON !== lastSceneJSON.current) {
                console.log('🎨 [TB SYNC] Mise à jour Pusher reçue');
                isUpdatingFromExternal.current = true; // ⚠️ CORRECTION : Marquer comme externe
                setSceneData(data.sceneData);
                lastSceneJSON.current = newSceneJSON;
            }
        };

        channel.bind(WHITEBOARD_UPDATE_EVENT, handleUpdate);

        return () => {
            console.log('🔌 [TB SYNC] Nettoyage: Désabonnement Pusher');
            channel.unbind(WHITEBOARD_UPDATE_EVENT, handleUpdate);
            pusherClient.unsubscribe(channelName);
            
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = null;
            }
        };
    }, [sessionId]);

    // ⚠️ CORRECTION : persistScene avec protection contre les boucles
    const persistScene = useCallback((data: ExcalidrawScene) => {
        // ⚠️ CORRECTION : Ignorer si la mise à jour vient d'une source externe
        if (isUpdatingFromExternal.current) {
            console.log('🚫 [TB SYNC] Mise à jour ignorée (source externe)');
            isUpdatingFromExternal.current = false;
            return;
        }

        console.log('💾 [TB SYNC] persistScene appelée');
        const pusherClient = getPusherClient();
        const newSceneJSON = JSON.stringify(data);

        // ⚠️ CORRECTION : Vérification plus stricte des changements
        if (newSceneJSON === lastSceneJSON.current) {
            console.log('🤷‍♂️ [TB SYNC] Aucun changement détecté, skip');
            return;
        }

        console.log('🎨 [TB SYNC] Changement local détecté - mise à jour optimiste');
        setSceneData(data);
        lastSceneJSON.current = newSceneJSON;

        // ⚠️ CORRECTION : Nettoyer le timeout précédent
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // ⚠️ CORRECTION : Débouncer l'envoi avec timeout plus long
        saveTimeoutRef.current = setTimeout(() => {
            console.log('📡 [TB SYNC] Envoi des données à l\'API');
            fetch(`/api/session/${sessionId}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sceneData: data,
                    senderSocketId: pusherClient.connection.socket_id,
                }),
            }).catch(error => {
                console.error("❌ [TB SYNC] Erreur de synchronisation:", error);
            });
            
            saveTimeoutRef.current = null;
        }, DEBOUNCE_SAVE_TIME);

    }, [sessionId]);

    console.log('🔄 [TB SYNC] Rendu du hook - isLoading:', isLoading);
    
    return {
        sceneData,
        persistScene,
        isLoading,
    };
};