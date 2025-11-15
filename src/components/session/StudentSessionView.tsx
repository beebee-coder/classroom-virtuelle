// src/components/session/StudentSessionView.tsx - VERSION CORRIGÉE
'use client';

import { useState, type ReactNode, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Participant } from '@/components/Participant';
import { SessionParticipant, DocumentInHistory, Html5CanvasScene, ComprehensionLevel, WhiteboardOperation, Role } from '@/types';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Loader2, File, Users } from 'lucide-react';
import { StudentSessionControls } from './StudentSessionControls';
import { updateStudentSessionStatus } from '@/lib/actions/session.actions';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { SessionTimer } from './SessionTimer';
import { DocumentViewer } from './DocumentViewer';
import { Button } from '../ui/button';
import React from 'react';
import { Html5Whiteboard } from '../Html5Whiteboard';
import { AnimatedCard } from './AnimatedCard';
import { useSession } from 'next-auth/react';

interface StudentSessionViewProps {
    sessionId: string;
    localStream: MediaStream | null;
    spotlightedStream: MediaStream | null;
    spotlightedUser: SessionParticipant | null | undefined;
    isHandRaised: boolean;
    onToggleHandRaise: (isRaised: boolean) => void;
    onUnderstandingChange: (status: ComprehensionLevel) => void;
    onLeaveSession: () => void;
    currentUnderstanding: ComprehensionLevel;
    currentUserId: string;
    activeTool: string;
    documentUrl: string | null;
    whiteboardControllerId: string | null;
    timerTimeLeft: number;
    onWhiteboardEvent: (event: WhiteboardOperation[]) => void;
    whiteboardOperations: WhiteboardOperation[];
    flushWhiteboardOperations?: () => void;
    onlineMembersCount: number;
    isPresenceConnected: boolean;
}

export function StudentSessionView({
    sessionId,
    localStream,
    spotlightedStream,
    spotlightedUser,
    isHandRaised,
    onToggleHandRaise,
    onUnderstandingChange,
    onLeaveSession,
    currentUnderstanding,
    currentUserId,
    activeTool,
    documentUrl,
    whiteboardControllerId,
    timerTimeLeft,
    onWhiteboardEvent,
    whiteboardOperations,
    flushWhiteboardOperations,
    onlineMembersCount,
    isPresenceConnected,
}: StudentSessionViewProps) {
    const { toast } = useToast();
    const { data: session } = useSession();

    const [isHandRaiseLoading, setIsHandRaiseLoading] = useState(false);
    const [isUnderstandingLoading, setIsUnderstandingLoading] = useState(false);

    // CORRECTION: Logs pour le debugging du whiteboard
    useEffect(() => {
        console.log(`🎯 [STUDENT VIEW] - Active tool: ${activeTool}, Whiteboard operations: ${whiteboardOperations.length}`);
        console.log(`🎯 [STUDENT VIEW] - Whiteboard controller: ${whiteboardControllerId}, Current user: ${currentUserId}`);
        
        if (activeTool === 'whiteboard' && whiteboardOperations.length > 0) {
            console.log(`🎯 [STUDENT VIEW] - Last operation:`, whiteboardOperations[whiteboardOperations.length - 1]);
        }
    }, [activeTool, whiteboardOperations, whiteboardControllerId, currentUserId]);

    const handleToggleHandRaise = useCallback(async (): Promise<void> => {
        if (isHandRaiseLoading) return;
        
        const newHandRaiseState = !isHandRaised;
        setIsHandRaiseLoading(true);
        
        const previousHandRaiseState = isHandRaised;
        
        onToggleHandRaise(newHandRaiseState);
        
        try {
            await updateStudentSessionStatus(sessionId, {
                isHandRaised: newHandRaiseState,
                understanding: currentUnderstanding
            });
        } catch (error) {
            toast({ 
                variant: 'destructive', 
                title: 'Erreur', 
                description: 'Impossible de mettre à jour le statut de la main levée.'
            });
            onToggleHandRaise(previousHandRaiseState);
        } finally {
            setIsHandRaiseLoading(false);
        }
    }, [isHandRaiseLoading, isHandRaised, sessionId, currentUnderstanding, onToggleHandRaise, toast]);
    
    const handleUnderstandingUpdate = useCallback(async (status: ComprehensionLevel): Promise<void> => {
        if (isUnderstandingLoading) return;
        
        const newStatus = currentUnderstanding === status ? ComprehensionLevel.NONE : status;
        setIsUnderstandingLoading(true);
        
        const previousStatus = currentUnderstanding;
        
        onUnderstandingChange(newStatus);
        
        try {
            await updateStudentSessionStatus(sessionId, { 
                understanding: newStatus,
                isHandRaised
            });
        } catch (error) {
            toast({ 
                variant: 'destructive', 
                title: 'Erreur', 
                description: 'Impossible de mettre à jour le statut de compréhension.'
            });
            onUnderstandingChange(previousStatus);
        } finally {
            setIsUnderstandingLoading(false);
        }
    }, [isUnderstandingLoading, currentUnderstanding, sessionId, isHandRaised, onUnderstandingChange, toast]);

    // CORRECTION: Gestion améliorée des événements whiteboard
    const handleWhiteboardEvent = useCallback((operations: WhiteboardOperation[]) => {
        console.log(`📥 [STUDENT VIEW] - Received ${operations.length} whiteboard operations`);
        onWhiteboardEvent(operations);
    }, [onWhiteboardEvent]);

    const handleFlushWhiteboardOperations = useCallback(() => {
        console.log(`🚀 [STUDENT VIEW] - Flushing whiteboard operations`);
        if (flushWhiteboardOperations) {
            flushWhiteboardOperations();
        }
    }, [flushWhiteboardOperations]);

    const renderMainContent = useCallback(() => {
        console.log(`🔄 [STUDENT VIEW] - Rendering main content for tool: ${activeTool}`);
        
        switch(activeTool) {
            case 'document':
                return <DocumentViewer url={documentUrl} />;
            case 'whiteboard':
                return (
                    <div className="h-full w-full relative">
                        {/* CORRECTION: Indicateur de statut de connexion */}
                        <div className={`absolute top-2 left-2 z-10 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            isPresenceConnected 
                                ? 'bg-green-100 text-green-800 border border-green-200' 
                                : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                        }`}>
                            {isPresenceConnected 
                                ? `✅ Connecté (${onlineMembersCount} en ligne)` 
                                : '⏳ Connexion...'
                            }
                        </div>
                        
                        <Html5Whiteboard
                            sessionId={sessionId}
                            userId={currentUserId}
                            isController={currentUserId === whiteboardControllerId}
                            operations={whiteboardOperations}
                            onEvent={handleWhiteboardEvent}
                            flushOperations={handleFlushWhiteboardOperations}
                        />
                    </div>
                );
            case 'camera':
            default:
                if (!spotlightedUser) {
                    return (
                        <Card className="h-full w-full flex flex-col items-center justify-center bg-muted/30 border-dashed">
                            <CardContent className="text-center text-muted-foreground p-6">
                                <Users className="h-10 w-10 mx-auto mb-4" />
                                <h3 className="font-semibold text-xl">En attente du professeur...</h3>
                                <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mt-2 ${
                                    isPresenceConnected 
                                        ? 'bg-green-100 text-green-800 border border-green-200' 
                                        : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                }`}>
                                    {isPresenceConnected 
                                        ? `✅ Connecté à la classe (${onlineMembersCount} en ligne)` 
                                        : '⏳ Connexion en cours...'
                                    }
                                </div>
                            </CardContent>
                        </Card>
                    );
                }

                if (!spotlightedStream) {
                  return (
                    <Card className="h-full w-full flex flex-col items-center justify-center bg-muted/30 border-dashed">
                        <CardContent className="text-center text-muted-foreground p-6">
                            <Loader2 className="h-10 w-10 mx-auto mb-4 animate-spin" />
                            <h3 className="font-semibold text-xl">Connexion à {spotlightedUser.name}...</h3>
                        </CardContent>
                    </Card>
                  );
                }

                return (
                    <div className="w-full h-full">
                        <Participant 
                            stream={spotlightedStream}
                            isLocal={false} 
                            isSpotlighted={true}
                            isTeacher={spotlightedUser.role === Role.PROFESSEUR}
                            participantUserId={spotlightedUser?.id ?? ''}
                            displayName={spotlightedUser?.name ?? 'Participant'}
                            isHandRaised={isHandRaised}
                        />
                    </div>
                );
        }
    }, [
        activeTool,
        documentUrl,
        whiteboardControllerId,
        currentUserId,
        whiteboardOperations,
        spotlightedUser,
        spotlightedStream,
        isHandRaised,
        sessionId,
        isPresenceConnected,
        onlineMembersCount,
        handleWhiteboardEvent,
        handleFlushWhiteboardOperations
    ]);
    
    const mainContent = useMemo(() => renderMainContent(), [renderMainContent]);
    
    return (
        <div className="flex flex-row flex-1 min-h-0 gap-4">
            <div className="flex-1 flex flex-col min-w-0">
                <div className="w-full h-full relative rounded-lg overflow-hidden border">
                    {mainContent}
                </div>
            </div>

            <div className="w-80 flex-shrink-0 flex flex-col">
                <motion.div layout className="h-full flex flex-col gap-1">
                    <ScrollArea className="flex-1 pr-3 -mr-3">
                         <div className="space-y-4">
                             {activeTool !== 'camera' && spotlightedUser && spotlightedStream && (
                                <AnimatedCard title={spotlightedUser.name || "Professeur"}>
                                    <div className="p-2">
                                         <Participant
                                            stream={spotlightedStream}
                                            isLocal={false} 
                                            isSpotlighted={false}
                                            isTeacher={spotlightedUser.role === Role.PROFESSEUR}
                                            participantUserId={spotlightedUser.id}
                                            displayName={spotlightedUser.name || "Professeur"}
                                        />
                                    </div>
                                </AnimatedCard>
                             )}
                             <AnimatedCard title="Ma Vidéo">
                                <div className="p-2">
                                    {localStream ? (
                                        <Participant
                                            stream={localStream}
                                            isLocal={true}
                                            isTeacher={false}
                                            participantUserId={currentUserId}
                                            displayName="Vous"
                                            isHandRaised={isHandRaised}
                                            isWhiteboardController={currentUserId === whiteboardControllerId}
                                        />
                                    ) : (
                                        <div className="text-center text-muted-foreground p-4 aspect-video flex flex-col items-center justify-center">
                                            <File className="h-8 w-8 mx-auto mb-2" />
                                            <p className="text-sm">Caméra non disponible</p>
                                        </div>
                                    )}
                                </div>
                            </AnimatedCard>
                             
                             <AnimatedCard title="Minuteur">
                                 <SessionTimer
                                    isTeacher={false}
                                    sessionId={sessionId}
                                    timeLeft={timerTimeLeft}
                                    isTimerRunning={false}
                                    initialDuration={0}
                                    onStart={() => {}}
                                    onPause={() => {}}
                                    onReset={() => {}}
                                />
                             </AnimatedCard>
                             
                             <AnimatedCard title="Mes Outils">
                                 <StudentSessionControls
                                    isHandRaised={isHandRaised}
                                    onRaiseHand={handleToggleHandRaise}
                                    onComprehensionUpdate={handleUnderstandingUpdate}
                                    currentComprehension={currentUnderstanding}
                                    isLoading={isHandRaiseLoading || isUnderstandingLoading}
                                />
                            </AnimatedCard>
                            
                            {activeTool === 'whiteboard' && (
                                <AnimatedCard title="Contrôle Tableau">
                                    <div className="p-2 text-center">
                                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                            currentUserId === whiteboardControllerId 
                                                ? 'bg-green-100 text-green-800 border border-green-200' 
                                                : 'bg-gray-100 text-gray-800 border border-gray-200'
                                        }`}>
                                            {currentUserId === whiteboardControllerId 
                                                ? '✅ Vous contrôlez le tableau' 
                                                : '👀 Vous visualisez seulement'
                                            }
                                        </div>
                                        {/* CORRECTION: Affichage des statistiques du whiteboard */}
                                        <div className="mt-2 text-xs text-muted-foreground">
                                            {whiteboardOperations.length} opérations chargées
                                        </div>
                                    </div>
                                </AnimatedCard>
                            )}
                        </div>
                    </ScrollArea>
                </motion.div>
            </div>
        </div>
    );
}