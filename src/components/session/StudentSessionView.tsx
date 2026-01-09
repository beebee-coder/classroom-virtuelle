// src/components/session/StudentSessionView.tsx
'use client';

import { useState, type ReactNode, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Participant } from '@/components/Participant';
import { DocumentInHistory, Html5CanvasScene, ComprehensionLevel, WhiteboardOperation, Role, BreakoutRoom, QuizWithQuestions } from '@/types'; // CORRECTION: Ajouter QuizWithQuestions
import { Card, CardContent, CardHeader } from '../ui/card';
import { Loader2, File, Video, VideoOff, PanelLeftClose, PanelLeftOpen, Timer, Wrench, Users } from 'lucide-react';
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
import { QuizResultsCelebration } from './quiz/QuizResultsCelebration';
import { cn } from '@/lib/utils';

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
    activeQuiz: QuizWithQuestions | null; // CORRECTION: Changer Quiz en QuizWithQuestions
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
    const [isSidebarVisible, setIsSidebarVisible] = useState(true);
    const [showCelebration, setShowCelebration] = useState(false);
    const [celebrationData, setCelebrationData] = useState<{
      quizTitle: string;
      topStudents: { userId: string; name: string; score: number; rank: 1 | 2 | 3 }[];
    } | null>(null);

    const sidebarToggleRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                setIsSidebarVisible(false);
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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

    useEffect(() => {
      if (quizResults && activeQuiz && !showCelebration) {
        const studentScores: { userId: string; name: string; score: number }[] = [];
        allSessionUsers.forEach(user => {
          if (user.role === Role.ELEVE) {
            const scoreData = quizResults.scores?.[user.id];
            const score = scoreData ? scoreData.score : 0;
            studentScores.push({ 
              userId: user.id, 
              name: user.name || 'Élève', 
              score 
            });
          }
        });

        studentScores.sort((a, b) => b.score - a.score);
        const top3 = studentScores.slice(0, 3).map((s, i) => ({
          ...s,
          rank: (i + 1) as 1 | 2 | 3
        }));

        setCelebrationData({
          quizTitle: activeQuiz.title,
          topStudents: top3
        });
        setShowCelebration(true);
      }
    }, [quizResults, activeQuiz, allSessionUsers]);

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

    const handleSubmitQuizResponse = useCallback(async (response: QuizResponse): Promise<{ success: boolean }> => {
        if (!activeQuiz) {
          toast({ variant: 'destructive', title: 'Quiz terminé', description: 'Le quiz est déjà terminé ou non disponible.' });
          return { success: false };
        }
      
        const completeResponse: QuizResponse = {
            quizId: activeQuiz.id,
            userId: response.userId,
            answers: response.answers,
            userName: ''
        };
      
        return await onSubmitQuizResponse(completeResponse);
      }, [activeQuiz, onSubmitQuizResponse, toast]);

    const renderMainContent = (): ReactNode => {
        switch(mainView) {
            case 'breakout':
                if (breakoutRoomInfo) {
                    return (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-muted/20 p-4">
                            <div className="text-center max-w-md">
                                <Users className="h-10 w-10 mx-auto text-primary mb-3" />
                                <h3 className="font-semibold text-lg mb-1">Vous êtes en groupe de travail</h3>
                                <p className="text-sm text-muted-foreground">
                                    {breakoutRoomInfo.name || 'Groupe temporaire'}
                                </p>
                                {breakoutRoomInfo.task && (
                                    <p className="mt-2 text-sm bg-background p-3 rounded-md border">
                                        {breakoutRoomInfo.task}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
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
                        <QuizView 
                            quiz={activeQuiz} 
                            isTeacherView={false} 
                            onSubmitResponse={handleSubmitQuizResponse} 
                            results={quizResults} 
                        />
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
                                <div className="relative">
                                    <VideoOff className="h-12 w-12 mx-auto text-orange-500" />
                                    <div className="absolute -top-1 -right-1 bg-orange-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs">
                                        {onlineMembersCount}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-xl mb-2">
                                        {effectiveSpotlightedUser 
                                            ? effectiveSpotlightedUser.name || 'Professeur' 
                                            : 'En attente du professeur...'}
                                    </h3>
                                    <p className="text-sm text-muted-foreground max-w-md">
                                        {isPresenceConnected 
                                            ? 'Connexion vidéo en cours…' 
                                            : 'Connexion au service en cours…'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    <span className={cn(
                                        "text-xs",
                                        isPresenceConnected ? "text-green-500" : "text-blue-500"
                                    )}>
                                        {isPresenceConnected ? 'WebRTC' : 'Ably'} en cours…
                                    </span>
                                </div>
                                {onlineMembersCount > 1 && (
                                    <p className="text-xs mt-2 text-muted-foreground">
                                        {onlineMembersCount - 1} autre(s) élève(s) connecté(s)
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                );
        }
    };
    
    return (
        <div className="flex flex-row flex-1 min-h-0 overflow-hidden">
            {showCelebration && celebrationData && (
              <QuizResultsCelebration
                quizTitle={celebrationData.quizTitle}
                topStudents={celebrationData.topStudents}
                onClose={() => setShowCelebration(false)}
              />
            )}

            <div className="flex-1 flex flex-col min-w-0 relative">
                <div className="w-full h-full relative rounded-lg overflow-hidden border bg-card">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={mainView}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.15 }}
                            className="w-full h-full"
                        >
                            {renderMainContent()}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {!isSidebarVisible && (
                    <button
                        onClick={() => setIsSidebarVisible(true)}
                        className="absolute top-3 right-3 z-10 bg-background/80 backdrop-blur-sm rounded-full p-2 shadow-md border"
                        aria-label="Afficher les outils"
                    >
                        <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
                    </button>
                )}
            </div>

            <AnimatePresence>
                {isSidebarVisible && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 280, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="flex-shrink-0 flex flex-col relative"
                    >
                        <ScrollArea className="h-full pr-2 -mr-2">
                            <div className="space-y-4 p-3">
                                <div className="space-y-4">
                                    <AnimatedCard title="Mes Outils" icon={Wrench}>
                                        <StudentSessionControls
                                            isHandRaised={isHandRaised}
                                            onRaiseHand={handleToggleHandRaise}
                                            onComprehensionUpdate={handleUnderstandingUpdate}
                                            currentComprehension={currentUnderstanding}
                                            isLoading={isHandRaiseLoading || isUnderstandingLoading}
                                        />
                                    </AnimatedCard>

                                    <AnimatedCard title="Minuteur" icon={Timer}>
                                        <div className="px-2 py-3">
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
                                        </div>
                                    </AnimatedCard>

                                    {mainView !== 'spotlight' && isSpotlightStreamValid && spotlightedStream && effectiveSpotlightedUser && (
                                        <AnimatedCard title={effectiveSpotlightedUser.name || "Professeur"} icon={Video}>
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
                                </div>
                            </div>
                        </ScrollArea>

                        <button
                            onClick={() => setIsSidebarVisible(false)}
                            className="absolute top-3 -left-8 bg-background p-1 rounded-s-lg border-y border-l shadow-sm hover:bg-muted z-10"
                            aria-label="Fermer les outils"
                        >
                            <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}