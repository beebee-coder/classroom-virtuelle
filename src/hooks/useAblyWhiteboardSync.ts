// src/hooks/useAblyWhiteboardSync.ts - VERSION CORRIGÉE AVEC THROTTLING
'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { WhiteboardOperation } from '@/types';
import { useAbly } from './useAbly';
import { getSessionChannelName } from '@/lib/ably/channels';
import { AblyEvents } from '@/lib/ably/events';
import Ably from 'ably';

// CORRECTION : Augmenter les délais et réduire la fréquence pour respecter les limites Ably
const BATCH_DELAY_MS = 100; // Augmenté de 50ms à 100ms
const MAX_BATCH_SIZE = 20; // Réduit de 50 à 20
const RATE_LIMIT_WINDOW_MS = 1000; // Fenêtre de 1 seconde
const MAX_OPS_PER_SECOND = 40; // Limite conservatrice (Ably = 50)

export const useAblyWhiteboardSync = (
    sessionId: string,
    userId: string,
    onIncomingOperations: (operations: WhiteboardOperation[]) => void
) => {
    const { client, isConnected, connectionState } = useAbly();
    const isLoading = connectionState === 'initialized' || connectionState === 'connecting';
    
    const [isSyncing, setIsSyncing] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    
    const isMounted = useRef(true);
    
    const pendingOperations = useRef<WhiteboardOperation[]>([]);
    const batchTimeout = useRef<NodeJS.Timeout | null>(null);
    const processedOperationIds = useRef<Set<string>>(new Set());
    const channelRef = useRef<Ably.Types.RealtimeChannelCallbacks | null>(null);
    const batchOperationsListenerRef = useRef<((message: Ably.Types.Message) => void) | null>(null);
    const channelStateListenerRef = useRef<((stateChange: Ably.Types.ChannelStateChange) => void) | null>(null);
    
    // CORRECTION : Ajout du système de throttling pour le rate limiting
    const rateLimitTracker = useRef<number[]>([]);
    const isRateLimited = useRef(false);
    
    const onIncomingOperationsRef = useRef(onIncomingOperations);
    
    useEffect(() => {
        onIncomingOperationsRef.current = onIncomingOperations;
    }, [onIncomingOperations]);

    // CORRECTION : Fonction de vérification du rate limiting
    const checkRateLimit = useCallback(() => {
        const now = Date.now();
        // Nettoyer les timestamps anciens
        rateLimitTracker.current = rateLimitTracker.current.filter(
            timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS
        );
        
        // Vérifier si on dépasse la limite
        if (rateLimitTracker.current.length >= MAX_OPS_PER_SECOND) {
            if (!isRateLimited.current) {
                console.warn(`⚠️ [WHITEBOARD SYNC] - Rate limiting activated, ${rateLimitTracker.current.length} ops in last second`);
                isRateLimited.current = true;
            }
            return false;
        }
        
        isRateLimited.current = false;
        return true;
    }, []);

    // CORRECTION : flushBatch avec gestion du rate limiting
    const flushBatch = useCallback(async () => {
        if (batchTimeout.current) {
            clearTimeout(batchTimeout.current);
            batchTimeout.current = null;
        }

        const opsToSend = [...pendingOperations.current];
        pendingOperations.current = [];

        if (opsToSend.length === 0) return;
        
        // CORRECTION : Vérifier le rate limiting avant d'envoyer
        if (!checkRateLimit()) {
            console.warn(`⏸️ [WHITEBOARD SYNC] - Rate limited, requeuing ${opsToSend.length} operations`);
            pendingOperations.current.unshift(...opsToSend);
            
            // Réessayer après un délai
            batchTimeout.current = setTimeout(() => {
                if (isMounted.current && pendingOperations.current.length > 0) {
                    flushBatch();
                }
            }, 200);
            return;
        }

        // CORRECTION : Enregistrer le timestamp pour le rate limiting
        rateLimitTracker.current.push(Date.now());
        
        setIsSyncing(true);

        try {
            const channel = channelRef.current;
            if (channel && (channel.state === 'attached' || channel.state === 'attaching')) {
                // CORRECTION : Limiter la taille du batch pour éviter les gros messages
                const batchChunks = [];
                for (let i = 0; i < opsToSend.length; i += MAX_BATCH_SIZE) {
                    batchChunks.push(opsToSend.slice(i, i + MAX_BATCH_SIZE));
                }
                
                for (const chunk of batchChunks) {
                    await channel.publish(AblyEvents.WHITEBOARD_OPERATION_BATCH, {
                        operations: chunk,
                        timestamp: Date.now(),
                        userId: userId,
                        sessionId: sessionId
                    });
                    console.log(`✅ [WHITEBOARD SYNC] - Sent batch of ${chunk.length} operations`);
                }
            } else {
                console.warn(`⚠️ [WHITEBOARD SYNC] - Channel not ready, state: ${channel?.state}, requeuing ${opsToSend.length} ops`);
                pendingOperations.current.unshift(...opsToSend);
                return;
            }

            // CORRECTION : API sync en arrière-plan sans bloquer
            fetch(`/api/session/${sessionId}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(opsToSend),
            }).catch(error => {
                console.warn(`⚠️ [WHITEBOARD SYNC] - API sync failed:`, error);
            });
            
        } catch (error) {
            console.error("❌ [WHITEBOARD SYNC] - Error sending batch:", error);
            pendingOperations.current.unshift(...opsToSend);
            
            // CORRECTION : Backoff exponentiel en cas d'erreur
            if (isMounted.current) {
                batchTimeout.current = setTimeout(() => {
                    if (isMounted.current && pendingOperations.current.length > 0) {
                        flushBatch();
                    }
                }, 1000);
            }
        } finally {
            if (isMounted.current) setIsSyncing(false);
        }
    }, [sessionId, userId, checkRateLimit]);

    // CORRECTION : Nettoyage amélioré
    useEffect(() => {
        isMounted.current = true;
        setIsInitialized(false);
        rateLimitTracker.current = [];
        isRateLimited.current = false;
        
        return () => { 
            isMounted.current = false;
            setIsInitialized(false);
            
            if (batchTimeout.current) {
                clearTimeout(batchTimeout.current);
                batchTimeout.current = null;
            }
            
            const cleanupChannel = channelRef.current;
            if (cleanupChannel) {
                if (batchOperationsListenerRef.current) {
                    cleanupChannel.unsubscribe(AblyEvents.WHITEBOARD_OPERATION_BATCH, batchOperationsListenerRef.current);
                    batchOperationsListenerRef.current = null;
                }
                if (channelStateListenerRef.current) {
                    cleanupChannel.off(channelStateListenerRef.current);
                    channelStateListenerRef.current = null;
                }
            }
            channelRef.current = null;
            
            pendingOperations.current = [];
            rateLimitTracker.current = [];
        };
    }, [sessionId]);

    // CORRECTION : scheduleBatch avec gestion du rate limiting
    const scheduleBatch = useCallback(() => {
        if (!isMounted.current) return;
        
        if (batchTimeout.current) {
            clearTimeout(batchTimeout.current);
        }
        
        // CORRECTION : Vérifier le rate limiting avant de planifier
        if (isRateLimited.current) {
            batchTimeout.current = setTimeout(() => {
                if (isMounted.current && pendingOperations.current.length > 0) {
                    scheduleBatch();
                }
            }, 100);
            return;
        }
        
        if (pendingOperations.current.length >= MAX_BATCH_SIZE) {
            flushBatch();
            return;
        }

        batchTimeout.current = setTimeout(() => {
            if (isMounted.current && pendingOperations.current.length > 0) {
                flushBatch();
            }
        }, BATCH_DELAY_MS);
    }, [flushBatch]);

    const attachChannel = useCallback(async (channel: Ably.Types.RealtimeChannelCallbacks) => {
        try {
            await channel.attach();
            console.log(`✅ [WHITEBOARD SYNC] - Successfully attached to whiteboard channel: ${channel.name}`);
            if (isMounted.current) {
                setIsInitialized(true);
            }
        } catch (error) {
            console.error("❌ [WHITEBOARD SYNC] - Failed to attach channel:", error);
            if (isMounted.current) {
                setIsInitialized(false);
                
                setTimeout(() => {
                    if (isMounted.current && channelRef.current === channel) {
                        console.log("🔄 [WHITEBOARD SYNC] - Retrying channel attachment...");
                        attachChannel(channel);
                    }
                }, 2000);
            }
        }
    }, []);

    // CORRECTION : Logique d'initialisation optimisée
    useEffect(() => {
        if (!sessionId || !userId || !client || isLoading || !isConnected) {
            if (isMounted.current) {
                setIsInitialized(false);
            }
            return;
        }

        const channelName = getSessionChannelName(sessionId);
        console.log(`🔧 [WHITEBOARD SYNC] - Setting up for channel: ${channelName}, user: ${userId}`);

        // CORRECTION : Logique de réutilisation améliorée
        const shouldReinitialize = !channelRef.current || 
                                 channelRef.current.name !== channelName || 
                                 !isInitialized;

        if (!shouldReinitialize) {
            console.log(`⏭️ [WHITEBOARD SYNC] - Already initialized with correct channel, skipping setup`);
            return;
        }

        // Nettoyer l'ancien canal si nécessaire
        if (channelRef.current && channelRef.current.name !== channelName) {
            console.log(`🔄 [WHITEBOARD SYNC] - Channel changed, reinitializing`);
            if (batchOperationsListenerRef.current) {
                channelRef.current.unsubscribe(AblyEvents.WHITEBOARD_OPERATION_BATCH, batchOperationsListenerRef.current);
            }
            if (channelStateListenerRef.current) {
                channelRef.current.off(channelStateListenerRef.current);
            }
        }

        const channel = client.channels.get(channelName);
        channelRef.current = channel;

        const handleBatchOperations = (message: Ably.Types.Message) => {
            if (!isMounted.current) return;
            
            try {
                const data = message.data as { 
                    operations: WhiteboardOperation[]; 
                    userId?: string;
                    sessionId?: string;
                };
                
                if (data.sessionId && data.sessionId !== sessionId) {
                    return;
                }
                
                if (data.userId === userId) {
                    return;
                }
                
                if (!data || !Array.isArray(data.operations)) {
                    console.warn('⚠️ [WHITEBOARD SYNC] - Invalid operation batch received');
                    return;
                }

                console.log(`📥 [WHITEBOARD SYNC] - Received ${data.operations.length} operations from user ${data.userId}`);

                const externalOps = data.operations.filter(op => {
                    if (processedOperationIds.current.has(op.id)) {
                        return false;
                    }
                    processedOperationIds.current.add(op.id);
                    return true;
                });
                
                if (externalOps.length > 0) {
                    onIncomingOperationsRef.current(externalOps);
                }
            } catch (error) {
                console.error("❌ [WHITEBOARD SYNC] - Error processing incoming operations:", error);
            }
        };

        const handleChannelState = (stateChange: Ably.Types.ChannelStateChange) => {
            console.log(`🔧 [WHITEBOARD SYNC] - Channel state change: ${stateChange.previous} -> ${stateChange.current}`);
            
            if (stateChange.current === 'attached') {
                if (isMounted.current) {
                    setIsInitialized(true);
                }
            } else if (stateChange.current === 'detached' || stateChange.current === 'failed') {
                if (isMounted.current) {
                    setIsInitialized(false);
                }
                
                if (stateChange.current === 'failed' && isMounted.current) {
                    setTimeout(() => {
                        if (isMounted.current && channelRef.current === channel) {
                            console.log("🔄 [WHITEBOARD SYNC] - Reattaching after failure...");
                            attachChannel(channel);
                        }
                    }, 2000);
                }
            }
        };

        // CORRECTION : S'assurer qu'il n'y a pas d'écouteurs en double
        channel.unsubscribe(AblyEvents.WHITEBOARD_OPERATION_BATCH);
        channel.subscribe(AblyEvents.WHITEBOARD_OPERATION_BATCH, handleBatchOperations);
        channel.on(handleChannelState);
        
        batchOperationsListenerRef.current = handleBatchOperations;
        channelStateListenerRef.current = handleChannelState;

        // Gérer l'état initial
        if (channel.state === 'attached') {
            if (isMounted.current) {
                setIsInitialized(true);
            }
        } else if (channel.state !== 'attaching') {
            attachChannel(channel);
        }

        return () => {
            console.log(`🧹 [WHITEBOARD SYNC] - Cleanup effect for channel: ${channelName}`);
        };
    }, [sessionId, userId, client, isLoading, isConnected, isInitialized, attachChannel]);

    // CORRECTION : sendOperation avec throttling intégré
    const sendOperation = useCallback((operations: WhiteboardOperation | WhiteboardOperation[]) => {
        if (!sessionId || !isMounted.current || !isInitialized) {
            console.warn(`⚠️ [WHITEBOARD SYNC] - Cannot send operations, initialized: ${isInitialized}, session: ${sessionId}`);
            return;
        }
        
        const opsArray = Array.isArray(operations) ? operations : [operations];
        
        // CORRECTION : Appliquer localement immédiatement
        onIncomingOperationsRef.current(opsArray);
        
        opsArray.forEach(op => {
            processedOperationIds.current.add(op.id);
        });
        
        // CORRECTION : Filtrer les opérations si on est rate limited
        if (isRateLimited.current && pendingOperations.current.length > 10) {
            console.warn(`⏸️ [WHITEBOARD SYNC] - Rate limited, dropping ${opsArray.length} operations`);
            return;
        }
        
        pendingOperations.current.push(...opsArray);
        scheduleBatch();

        console.log(`📤 [WHITEBOARD SYNC] - Queued ${opsArray.length} operations, pending: ${pendingOperations.current.length}, rateLimited: ${isRateLimited.current}`);

    }, [sessionId, isInitialized, scheduleBatch]);

    const flushOperations = useCallback(() => {
        if (isMounted.current && isInitialized && pendingOperations.current.length > 0) {
            console.log(`🚀 [WHITEBOARD SYNC] - Flushing ${pendingOperations.current.length} operations`);
            flushBatch();
        }
    }, [flushBatch, isInitialized]);

    return {
        sendOperation,
        flushOperations,
        isSyncing,
        isInitialized
    };
};