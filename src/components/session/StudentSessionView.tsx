// src/components/session/StudentSessionView.tsx - VERSION CORRIGÉE
'use client';

import { useState, type ReactNode, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Participant } from '@/components/Participant';
import { SessionParticipant, DocumentInHistory, Html5CanvasScene, ComprehensionLevel, WhiteboardOperation, Role } from '@/types';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Loader2, File, Users, Video, VideoOff } from 'lucide-react';
import { StudentSessionControls } from './StudentSessionControls';
import { updateStudentSessionStatus } from '@/lib/actions/ably-session.actions';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { SessionTimer } from './SessionTimer';
import { DocumentViewer } from './DocumentViewer';
import { Button } from '../ui/button';
import React from 'react';
import { Html5Whiteboard } from '../Html5Whiteboard';
import { AnimatedCard } from './AnimatedCard';
import type { Quiz, QuizResponse, QuizResults } from '@/types';
import { QuizView } from './quiz/QuizView';

interface StudentSessionViewProps {
    sessionId: string;
    localStream: MediaStream | null;
    spotlightedStream: MediaStream | null;
    spotlightedUser: SessionParticipant | null;
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
    activeQuiz: Quiz | null;
    onSubmitQuizResponse: (response: QuizResponse) => Promise<{ success: boolean; }>;
    quizResults: QuizResults | null;
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
    activeQuiz,
    onSubmitQuizResponse,
    quizResults,
}: StudentSessionViewProps) {
    const { toast } = useToast();

    const [mainView, setMainView] = useState<'spotlight' | 'whiteboard' | 'document' | 'quiz'>('spotlight');
    const [isHandRaiseLoading, setIsHandRaiseLoading] = useState(false);
    const [isUnderstandingLoading, setIsUnderstandingLoading] = useState(false);

    useEffect(() => {
        if (activeTool === 'whiteboard' || activeTool === 'document') {
            setMainView(activeTool);
        } else if (activeQuiz) {
            setMainView('quiz');
        } else {
            setMainView('spotlight');
        }
    }, [activeTool, activeQuiz]);

    const handleToggleHandRaise = useCallback(async (): Promise<void> => {
        if (isHandRaiseLoading) {
            return;
        }
        
        const newHandRaiseState = !isHandRaised;
        setIsHandRaiseLoading(true);
        
        // Optimistic update
        onToggleHandRaise(newHandRaiseState);
        
        try {
            const result = await updateStudentSessionStatus(sessionId, {
                isHandRaised: newHandRaiseState,
                understanding: currentUnderstanding
            });
            
            if (!result.success) {
                // Revert on failure
                onToggleHandRaise(!newHandRaiseState);
            }
        } catch (error) {
            console.error('❌ [STUDENT VIEW] - Erreur mise à jour statut main:', error);
            // Revert on failure
            onToggleHandRaise(!newHandRaiseState);
            toast({ 
                variant: 'destructive', 
                title: 'Erreur', 
                description: 'Impossible de mettre à jour le statut de la main levée.'
            });
        } finally {
            setIsHandRaiseLoading(false);
        }
    }, [isHandRaiseLoading, isHandRaised, sessionId, currentUnderstanding, onToggleHandRaise, toast]);
    
    const handleUnderstandingUpdate = useCallback(async (status: ComprehensionLevel): Promise<void> => {
        if (isUnderstandingLoading) {
            return;
        }
        
        const newStatus = currentUnderstanding === status ? ComprehensionLevel.NONE : status;
        setIsUnderstandingLoading(true);
        
        // Optimistic update
        onUnderstandingChange(newStatus);
        
        try {
            const result = await updateStudentSessionStatus(sessionId, { 
                understanding: newStatus,
                isHandRaised
            });
            
            if (!result.success) {
                // Revert on failure
                onUnderstandingChange(currentUnderstanding);
            }
        } catch (error) {
            console.error('❌ [STUDENT VIEW] - Erreur mise à jour compréhension:', error);
            // Revert on failure
            onUnderstandingChange(currentUnderstanding);
            toast({ 
                variant: 'destructive', 
                title: 'Erreur', 
                description: 'Impossible de mettre à jour le statut de compréhension.'
            });
        } finally {
            setIsUnderstandingLoading(false);
        }
    }, [isUnderstandingLoading, currentUnderstanding, sessionId, isHandRaised, onUnderstandingChange, toast]);

    const handleWhiteboardEvent = useCallback((operations: WhiteboardOperation[]) => {
        if (!operations || !Array.isArray(operations)) {
            return;
        }
        onWhiteboardEvent(operations);
    }, [onWhiteboardEvent]);

    const handleFlushWhiteboardOperations = useCallback(() => {
        if (flushWhiteboardOperations && typeof flushWhiteboardOperations === 'function') {
            flushWhiteboardOperations();
        }
    }, [flushWhiteboardOperations]);

    const isSpotlightStreamValid = useMemo(() => {
        return !!spotlightedStream && 
               spotlightedStream.active && 
               (spotlightedStream.getAudioTracks().length > 0 || spotlightedStream.getVideoTracks().length > 0);
    }, [spotlightedStream]);

    const renderMainContent = (): ReactNode => {
        switch(mainView) {
            case 'document':
                return <DocumentViewer url={documentUrl} />;
                
            case 'whiteboard':
                return (
                    <div className="h-full w-full relative">
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
            
            case 'quiz':
                if (!activeQuiz) {
                    return (
                        <Card className="h-full w-full flex flex-col items-center justify-center">
                            <CardContent className="text-center text-muted-foreground p-6">
                                <Loader2 className="h-10 w-10 mx-auto mb-4 animate-spin" />
                                <h3 className="font-semibold">En attente du quiz...</h3>
                            </CardContent>
                        </Card>
                    );
                }
                
                return (
                    <div className="h-full w-full flex items-center justify-center p-4">
                        <QuizView
                            quiz={activeQuiz}
                            isTeacherView={false}
                            onSubmitResponse={onSubmitQuizResponse}
                            results={quizResults}
                        />
                    </div>
                );
                
            case 'spotlight':
            default:
                if (isSpotlightStreamValid && spotlightedStream && spotlightedUser) {
                    return (
                        <div className="w-full h-full relative bg-black rounded-lg overflow-hidden">
                            <Participant 
                                stream={spotlightedStream}
                                isLocal={false} 
                                isSpotlighted={true}
                                isTeacher={spotlightedUser.role === Role.PROFESSEUR}
                                participantUserId={spotlightedUser.id}
                                displayName={spotlightedUser.name ?? 'Participant'}
                                isHandRaised={isHandRaised}
                            />
                        </div>
                    );
                }

                return (
                    <Card className="h-full w-full flex flex-col items-center justify-center bg-muted/30 border-dashed">
                        <CardContent className="text-center text-muted-foreground p-6">
                            <div className="flex flex-col items-center gap-3">
                                <VideoOff className="h-12 w-12 mx-auto text-orange-500" />
                                <div>
                                    <h3 className="font-semibold text-xl mb-2">
                                        {spotlightedUser ? `${spotlightedUser.name} se connecte` : 'En attente du professeur...'}
                                    </h3>
                                    <p className="text-sm text-muted-foreground max-w-md">
                                        {spotlightedUser 
                                            ? 'La connexion vidéo est en cours d\'établissement...' 
                                            : 'Le professeur rejoindra bientôt la session'
                                        }
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-orange-600">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    <span>Connexion WebRTC en cours...</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
        }
    };
    
    return (
        <div className="flex flex-row flex-1 min-h-0 gap-4">
            <div className="flex-1 flex flex-col min-w-0">
                <div className="w-full h-full relative rounded-lg overflow-hidden border bg-card">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={mainView}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="w-full h-full"
                        >
                            {renderMainContent()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            <div className="w-60 flex-shrink-0 flex flex-col">
                <motion.div layout className="h-full flex flex-col gap-1">
                    <ScrollArea className="flex-1 pr-3 -mr-3">
                         <div className="space-y-4">
                             {mainView !== 'spotlight' && isSpotlightStreamValid && spotlightedStream && spotlightedUser && (
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
                                    {localStream && localStream.active ? (
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
                                        <div className="text-center text-muted-foreground p-4 aspect-video flex flex-col items-center justify-center border border-dashed rounded-lg">
                                            <VideoOff className="h-8 w-8 mx-auto mb-2 text-gray-400" />
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
                            
                            {mainView === 'whiteboard' && (
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
