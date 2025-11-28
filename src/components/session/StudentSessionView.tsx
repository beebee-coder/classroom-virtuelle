// src/components/session/StudentSessionView.tsx
'use client';

import { useState, type ReactNode, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Participant } from '@/components/Participant';
import { DocumentInHistory, Html5CanvasScene, ComprehensionLevel, WhiteboardOperation, Role, BreakoutRoom } from '@/types';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Loader2, File, Video, VideoOff } from 'lucide-react';
import { StudentSessionControls } from './StudentSessionControls';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { SessionTimer } from './SessionTimer';
import { DocumentViewer } from './DocumentViewer';
import React from 'react';
import { Html5Whiteboard } from '../Html5Whiteboard';
import { AnimatedCard } from './AnimatedCard';
import type { Quiz, QuizResponse, QuizResults, SessionParticipant, User } from '@/types';
import { QuizView } from './quiz/QuizView';
import { ChatWorkspace } from './ChatWorkspace';
import { BreakoutRoomView } from './breakout/BreakoutRoomView';

interface StudentSessionViewProps {
    sessionId: string;
    localStream: MediaStream | null;
    spotlightedStream: MediaStream | null;
    spotlightedUser: SessionParticipant | undefined | null;
    isHandRaised: boolean;
    onToggleHandRaise: (isRaised: boolean) => void;
    onUnderstandingChange: (status: ComprehensionLevel) => void;
    onLeaveSession: () => void;
    currentUnderstanding: ComprehensionLevel;
    currentUserId: string;
    currentUserRole: Role;
    classroomId: string | null;
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
    breakoutRoomInfo: BreakoutRoom | null;
    allSessionUsers: User[];
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
    currentUserRole,
    classroomId,
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
    breakoutRoomInfo,
    allSessionUsers,
}: StudentSessionViewProps) {
    const { toast } = useToast();
    const [mainView, setMainView] = useState<'spotlight' | 'whiteboard' | 'document' | 'quiz' | 'chat' | 'breakout'>('spotlight');
    const [isHandRaiseLoading, setIsHandRaiseLoading] = useState(false);
    const [isUnderstandingLoading, setIsUnderstandingLoading] = useState(false);

    useEffect(() => {
        if (breakoutRoomInfo) {
            setMainView('breakout');
        } else if (activeQuiz) {
            setMainView('quiz');
        } else if (activeTool === 'whiteboard' || activeTool === 'document' || activeTool === 'chat') {
            setMainView(activeTool);
        } else {
            setMainView('spotlight');
        }
    }, [activeTool, activeQuiz, breakoutRoomInfo]);

    const handleToggleHandRaise = useCallback(async (): Promise<void> => {
        if (isHandRaiseLoading) return;
        setIsHandRaiseLoading(true);
        try {
            await onToggleHandRaise(!isHandRaised);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de changer le statut de la main.' });
        } finally {
            setIsHandRaiseLoading(false);
        }
    }, [isHandRaiseLoading, isHandRaised, onToggleHandRaise, toast]);
    
    const handleUnderstandingUpdate = useCallback(async (status: ComprehensionLevel): Promise<void> => {
        if (isUnderstandingLoading || status === currentUnderstanding) return;
        setIsUnderstandingLoading(true);
        try {
            await onUnderstandingChange(status);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de mettre à jour le statut.' });
        } finally {
            setIsUnderstandingLoading(false);
        }
    }, [isUnderstandingLoading, currentUnderstanding, onUnderstandingChange, toast]);

    const handleWhiteboardEvent = useCallback((operations: WhiteboardOperation[]) => {
        if (!operations || !Array.isArray(operations)) return;
        onWhiteboardEvent(operations);
    }, [onWhiteboardEvent]);

    const handleFlushWhiteboardOperations = useCallback(() => {
        if (flushWhiteboardOperations && typeof flushWhiteboardOperations === 'function') {
            flushWhiteboardOperations();
        }
    }, [flushWhiteboardOperations]);

    const effectiveSpotlightedUser = useMemo(() => {
        return spotlightedUser || allSessionUsers.find(u => u.role === 'PROFESSEUR');
    }, [spotlightedUser, allSessionUsers]);

    const isSpotlightStreamValid = useMemo(() => {
        return !!spotlightedStream && 
               spotlightedStream.active && 
               (spotlightedStream.getAudioTracks().length > 0 || spotlightedStream.getVideoTracks().length > 0);
    }, [spotlightedStream]);

    const renderMainContent = (): ReactNode => {
        switch(mainView) {
            case 'breakout':
                if (breakoutRoomInfo) {
                    return <BreakoutRoomView room={breakoutRoomInfo} />;
                }
                return null;
            case 'chat':
                if (classroomId) {
                    return <ChatWorkspace classroomId={classroomId} userId={currentUserId} userRole={currentUserRole} />;
                }
                return <Card className="h-full w-full flex flex-col items-center justify-center"><CardContent className="text-center text-muted-foreground p-6"><h3 className="font-semibold">Chat non disponible</h3></CardContent></Card>;
            case 'document':
                return <DocumentViewer url={documentUrl} />;
            case 'whiteboard':
                return (
                    <div className="h-full w-full relative">
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
                return (
                    <div className="h-full w-full flex items-center justify-center p-4">
                        <QuizView quiz={activeQuiz} isTeacherView={false} onSubmitResponse={onSubmitQuizResponse} results={quizResults} />
                    </div>
                );
            case 'spotlight':
            default:
                if (isSpotlightStreamValid && spotlightedStream && effectiveSpotlightedUser) {
                    return (
                        <div className="w-full h-full relative bg-black rounded-lg overflow-hidden">
                            <Participant 
                                stream={spotlightedStream}
                                isLocal={false} 
                                isSpotlighted={true}
                                isTeacher={effectiveSpotlightedUser.role === Role.PROFESSEUR}
                                participantUserId={effectiveSpotlightedUser.id}
                                displayName={effectiveSpotlightedUser.name ?? 'Participant'}
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
                                        {effectiveSpotlightedUser ? `${effectiveSpotlightedUser.name} se connecte` : 'En attente du professeur...'}
                                    </h3>
                                    <p className="text-sm text-muted-foreground max-w-md">
                                        {effectiveSpotlightedUser 
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

            <div className="w-80 flex-shrink-0 flex flex-col">
                <motion.div layout className="h-full flex flex-col gap-1">
                    <ScrollArea className="flex-1 pr-3 -mr-3">
                         <div className="space-y-4">
                             {mainView !== 'spotlight' && isSpotlightStreamValid && spotlightedStream && effectiveSpotlightedUser && (
                                <AnimatedCard title={effectiveSpotlightedUser.name || "Professeur"}>
                                    <div className="p-2">
                                         <Participant
                                            stream={spotlightedStream}
                                            isLocal={false} 
                                            isSpotlighted={false}
                                            isTeacher={effectiveSpotlightedUser.role === Role.PROFESSEUR}
                                            participantUserId={effectiveSpotlightedUser.id}
                                            displayName={effectiveSpotlightedUser.name || "Professeur"}
                                        />
                                    </div>
                                </AnimatedCard>
                             )}
                             
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
                        </div>
                    </ScrollArea>
                </motion.div>
            </div>
        </div>
    );
}
