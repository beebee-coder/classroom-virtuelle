// src/hooks/useAblyWhiteboardSync.ts - VERSION CORRIGÉE AVEC useAbly()
'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { WhiteboardOperation } from '@/types';
import { useAbly } from './useAbly'; // CORRECTION: utiliser useAbly au lieu de useAblyWithSession
import { getSessionChannelName } from '@/lib/ably/channels';
import { AblyEvents } from '@/lib/ably/events';
import Ably from 'ably';

const BATCH_DELAY_MS = 50;
const MAX_BATCH_SIZE = 50;

export const useAblyWhiteboardSync = (
    sessionId: string,
    userId: string,
    onIncomingOperations: (operations: WhiteboardOperation[]) => void
) => {
    // CORRECTION: Utiliser useAbly() au lieu de useAblyWithSession()
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
    
    const onIncomingOperationsRef = useRef(onIncomingOperations);
    
    useEffect(() => {
        onIncomingOperationsRef.current = onIncomingOperations;
    }, [onIncomingOperations]);

    const flushBatch = useCallback(async () => {
        if (batchTimeout.current) {
            clearTimeout(batchTimeout.current);
            batchTimeout.current = null;
        }

        const opsToSend = [...pendingOperations.current];
        pendingOperations.current = [];

        if (opsToSend.length === 0) return;
        
        setIsSyncing(true);

        try {
            const channel = channelRef.current;
            if (channel && (channel.state === 'attached' || channel.state === 'attaching')) {
                await channel.publish(AblyEvents.WHITEBOARD_OPERATION_BATCH, {
                    operations: opsToSend,
                    timestamp: Date.now(),
                    userId: userId,
                    sessionId: sessionId
                });
                console.log(`✅ [WHITEBOARD SYNC] - Sent batch of ${opsToSend.length} operations to session ${sessionId}`);
            } else {
                console.warn(`⚠️ [WHITEBOARD SYNC] - Channel not ready, state: ${channel?.state}, requeuing ${opsToSend.length} ops`);
                pendingOperations.current.unshift(...opsToSend);
                return;
            }

            // Sauvegarder via l'API pour la persistance
            const response = await fetch(`/api/session/${sessionId}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(opsToSend),
            });

            if (!response.ok) {
                console.warn(`⚠️ [WHITEBOARD SYNC] - API sync failed: ${response.status}`);
            }
            
        } catch (error) {
            console.error("❌ [WHITEBOARD SYNC] - Error sending batch:", error);
            pendingOperations.current.unshift(...opsToSend);
        } finally {
            if (isMounted.current) setIsSyncing(false);
        }
    }, [sessionId, userId]);

    // CORRECTION: Nettoyage uniquement quand la session change vraiment
    useEffect(() => {
        isMounted.current = true;
        setIsInitialized(false);
        
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
                }
                if (channelStateListenerRef.current) {
                    cleanupChannel.off(channelStateListenerRef.current);
                }
            }
            channelRef.current = null;
            batchOperationsListenerRef.current = null;
            channelStateListenerRef.current = null;
            
            pendingOperations.current = [];
        };
    }, [sessionId]); // CORRECTION: Seulement quand sessionId change

    const scheduleBatch = useCallback(() => {
        if (!isMounted.current) return;
        
        if (batchTimeout.current) {
            clearTimeout(batchTimeout.current);
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

    // CORRECTION PRINCIPALE: Logique d'initialisation simplifiée et stable
    useEffect(() => {
        if (!sessionId || !userId || !client || isLoading || !isConnected) {
            if (isMounted.current) {
                setIsInitialized(false);
            }
            return;
        }

        const channelName = getSessionChannelName(sessionId);
        console.log(`🔧 [WHITEBOARD SYNC] - Setting up for channel: ${channelName}, user: ${userId}`);

        // CORRECTION: Éviter les réinitialisations inutiles
        // Si on a déjà le bon canal et qu'il est initialisé, ne rien faire
        if (channelRef.current && channelRef.current.name === channelName && isInitialized) {
            console.log(`⏭️ [WHITEBOARD SYNC] - Already initialized with correct channel, skipping setup`);
            return;
        }

        // CORRECTION: Réinitialiser uniquement si le canal change vraiment
        if (channelRef.current && channelRef.current.name !== channelName) {
            console.log(`🔄 [WHITEBOARD SYNC] - Channel changed from ${channelRef.current.name} to ${channelName}, reinitializing`);
            setIsInitialized(false);
            if (batchOperationsListenerRef.current) {
                channelRef.current.unsubscribe(AblyEvents.WHITEBOARD_OPERATION_BATCH, batchOperationsListenerRef.current);
            }
            if (channelStateListenerRef.current) {
                channelRef.current.off(channelStateListenerRef.current);
            }
            channelRef.current = null;
        }

        // CORRECTION: Réutiliser le canal existant si possible
        let channel = channelRef.current;
        if (!channel) {
            channel = client.channels.get(channelName);
            channelRef.current = channel;
        }

        const handleBatchOperations = (message: Ably.Types.Message) => {
            if (!isMounted.current) return;
            
            try {
                const data = message.data as { 
                    operations: WhiteboardOperation[]; 
                    userId?: string;
                    sessionId?: string;
                };
                
                // Vérifier que le message est pour cette session
                if (data.sessionId && data.sessionId !== sessionId) {
                    return;
                }
                
                // Ignorer ses propres messages
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

        // CORRECTION: Éviter les écouteurs en double
        if (!batchOperationsListenerRef.current) {
            batchOperationsListenerRef.current = handleBatchOperations;
            channelStateListenerRef.current = handleChannelState;

            channel.subscribe(AblyEvents.WHITEBOARD_OPERATION_BATCH, handleBatchOperations);
            channel.on(handleChannelState);
        }

        // Gérer l'état initial du canal
        if (channel.state === 'attached') {
            if (isMounted.current && !isInitialized) {
                setIsInitialized(true);
            }
        } else if ((channel.state === 'initialized' || channel.state === 'detached') && !isInitialized) {
            attachChannel(channel);
        } else {
            console.log(`⏳ [WHITEBOARD SYNC] - Channel in state: ${channel.state}, initialized: ${isInitialized}`);
        }

        return () => {
            // CORRECTION: Nettoyage minimal - ne pas déconnecter le canal
            // Les écouteurs sont nettoyés dans l'effet principal de nettoyage
            console.log(`🧹 [WHITEBOARD SYNC] - Cleanup effect for channel: ${channelName}`);
        };
    }, [sessionId, userId, client, isLoading, isConnected, isInitialized, attachChannel]);

    const sendOperation = useCallback((operations: WhiteboardOperation | WhiteboardOperation[]) => {
        if (!sessionId || !isMounted.current || !isInitialized) {
            console.warn(`⚠️ [WHITEBOARD SYNC] - Cannot send operations, initialized: ${isInitialized}, session: ${sessionId}`);
            return;
        }
        
        const opsArray = Array.isArray(operations) ? operations : [operations];
        
        // CORRECTION : Appliquer les opérations localement immédiatement pour une meilleure réactivité
        onIncomingOperationsRef.current(opsArray);
        
        opsArray.forEach(op => {
            processedOperationIds.current.add(op.id);
        });
        
        pendingOperations.current.push(...opsArray);
        scheduleBatch();

        console.log(`📤 [WHITEBOARD SYNC] - Queued ${opsArray.length} operations, pending: ${pendingOperations.current.length}`);

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
