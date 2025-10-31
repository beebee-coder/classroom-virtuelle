// src/hooks/useWhiteboardSync.ts
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ExcalidrawScene } from '@/types';
import { getPusherClient } from '@/lib/pusher/client';

const WHITEBOARD_UPDATE_EVENT = 'whiteboard-update';
const DEBOUNCE_SAVE_TIME = 1000; // ⚠️ CORRECTION : Augmenter à 1s pour plus de stabilité

export const useWhiteboardSync = (
    sessionId: string,
    initialScene: ExcalidrawScene | null
) => {
    const [sceneData, setSceneData] = useState<ExcalidrawScene | null>(initialScene);
    const [isLoading, setIsLoading] = useState(!initialScene);
    
    // ⚠️ CORRECTION CRITIQUE : Références pour contrôler les boucles
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSceneJSON = useRef<string | null>(initialScene ? JSON.stringify(initialScene) : null);
    const hasFetchedInitial = useRef(false);
    const isUpdatingFromExternal = useRef(false);
    const isPersisting = useRef(false); // ⚠️ CORRECTION : Nouveau flag pour éviter les récursions
    const pusherChannelRef = useRef<any>(null);

    // ⚠️ CORRECTION : Effet pour le chargement initial - UNIQUEMENT si nécessaire
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
                            isUpdatingFromExternal.current = true; // ⚠️ CORRECTION : Marquer comme externe
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

    // ⚠️ CORRECTION CRITIQUE : Effet Pusher avec gestion robuste des canaux
    useEffect(() => {
        console.log('🔌 [TB SYNC] Initialisation de l\'abonnement Pusher');
        const pusherClient = getPusherClient();
        const channelName = `presence-session-${sessionId}`;
        
        // ⚠️ CORRECTION : Vérifier si on est déjà abonné à ce canal
        if (pusherChannelRef.current && pusherChannelRef.current.name === channelName) {
            console.log('🔌 [TB SYNC] Déjà abonné à ce canal, skip');
            return;
        }

        // ⚠️ CORRECTION : Se désabonner de l'ancien canal si existe
        if (pusherChannelRef.current) {
            pusherClient.unsubscribe(pusherChannelRef.current.name);
        }

        const channel = pusherClient.subscribe(channelName);
        pusherChannelRef.current = channel;

        const handleUpdate = (data: { sceneData: ExcalidrawScene, senderId: string }) => {
            // ⚠️ CORRECTION : Ignorer si on est en train de persister
            if (isPersisting.current) {
                console.log('➡️ [TB SYNC] Mise à jour ignorée (en cours de persistance)');
                return;
            }

            // ⚠️ CORRECTION : Vérifications renforcées pour éviter les boucles
            if (data.senderId === pusherClient.connection.socket_id) {
                console.log('➡️ [TB SYNC] Mise à jour ignorée (propre émission)');
                return;
            };
            
            const newSceneJSON = JSON.stringify(data.sceneData);
            if (newSceneJSON !== lastSceneJSON.current) {
                console.log('🎨 [TB SYNC] Mise à jour Pusher reçue');
                isUpdatingFromExternal.current = true; // Marquer comme externe
                setSceneData(data.sceneData);
                lastSceneJSON.current = newSceneJSON;
                
                // ⚠️ CORRECTION : Réinitialiser le flag après un court délai
                setTimeout(() => {
                    isUpdatingFromExternal.current = false;
                }, 100);
            }
        };

        channel.bind(WHITEBOARD_UPDATE_EVENT, handleUpdate);

        return () => {
            console.log('🔌 [TB SYNC] Nettoyage: Désabonnement Pusher');
            if (channel) {
                channel.unbind(WHITEBOARD_UPDATE_EVENT, handleUpdate);
                pusherClient.unsubscribe(channelName);
            }
            
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = null;
            }
            
            pusherChannelRef.current = null;
        };
    }, [sessionId]);

    // ⚠️ CORRECTION CRITIQUE : persistScene avec protection complète contre les boucles
    const persistScene = useCallback((data: ExcalidrawScene) => {
        // ⚠️ CORRECTION : Ignorer si la mise à jour vient d'une source externe
        if (isUpdatingFromExternal.current) {
            console.log('🚫 [TB SYNC] Mise à jour ignorée (source externe)');
            return;
        }

        // ⚠️ CORRECTION : Ignorer si déjà en train de persister
        if (isPersisting.current) {
            console.log('🚫 [TB SYNC] Mise à jour ignorée (déjà en persistance)');
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
        
        // ⚠️ CORRECTION : Marquer comme persistant pour éviter les récursions
        isPersisting.current = true;
        setSceneData(data);
        lastSceneJSON.current = newSceneJSON;

        // ⚠️ CORRECTION : Nettoyer le timeout précédent
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // ⚠️ CORRECTION : Débouncer l'envoi avec timeout plus long
        saveTimeoutRef.current = setTimeout(async () => {
            try {
                console.log('📡 [TB SYNC] Envoi des données à l\'API');
                
                const response = await fetch(`/api/session/${sessionId}/sync`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sceneData: data,
                        senderSocketId: pusherClient.connection.socket_id,
                    }),
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                console.log('✅ [TB SYNC] Données synchronisées avec succès');
                
            } catch (error) {
                console.error("❌ [TB SYNC] Erreur de synchronisation:", error);
            } finally {
                // ⚠️ CORRECTION : Réinitialiser les flags après l'envoi
                isPersisting.current = false;
                saveTimeoutRef.current = null;
            }
        }, DEBOUNCE_SAVE_TIME);

    }, [sessionId]);

    // ⚠️ CORRECTION : Effet pour réinitialiser le flag de persistance en cas d'erreur
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
                isPersisting.current = false;
            }
        };
    }, []);

    console.log('🔄 [TB SYNC] Rendu du hook - isLoading:', isLoading);
    
    return {
        sceneData,
        persistScene,
        isLoading,
    };
};