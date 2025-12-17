// src/components/session/TeacherSessionView.tsx
'use client';

import React, { useState, type ReactNode, useEffect, useMemo, useCallback, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Role } from '@prisma/client';
import type { SessionParticipant, ClassroomWithDetails, DocumentInHistory, Html5CanvasScene, ComprehensionLevel, WhiteboardOperation, QuizWithQuestions, QuizResponse, QuizResults } from '@/types'; // CORRECTION: Utiliser QuizWithQuestions
import { Participant } from '@/components/Participant';
import { StudentPlaceholder } from '../StudentPlaceholder';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ClassStudentList } from './ClassStudentList';
import { Loader2, UploadCloud, File, Trash2, Share2, Award, Users, Grid, Presentation, MessageSquare, PanelRightOpen, PanelRightClose, Network, BookOpen, Timer, BarChart3, Hand } from 'lucide-react';
import { Button } from '../ui/button';
import { SessionStatus } from './SessionStatus';
import { cn } from '@/lib/utils';
import { ChatWorkspace } from './ChatWorkspace';
import { Html5Whiteboard } from '@/components/Html5Whiteboard';
import { AnimatedCard } from './AnimatedCard';
import { useToast } from '@/hooks/use-toast';
import { DocumentUploadSection } from './DocumentUploadSection';
import { shareDocumentToStudents, spotlightParticipant } from '@/lib/actions/session.actions';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { motion, AnimatePresence } from 'framer-motion';
import { QuizWorkspace } from './quiz/QuizWorkspace';
import { BreakoutRoomsManager } from './breakout/BreakoutRoomsManager';
import { QuickPollResults } from './QuickPollResults';
import { HandRaiseController } from './HandRaiseController';
import { SessionTimer } from './SessionTimer';
import { DocumentHistory } from './DocumentHistory';
import { DocumentViewer } from './DocumentViewer';
import type { CreateQuizData } from '@/lib/actions/ably-session.actions';
import { QuizResultsCelebration } from './quiz/QuizResultsCelebration';

// ✅ Interface typée pour renderParticipant — sécurité UX
interface RenderParticipantProps {
    currentUserId: string;
    isSharingScreen: boolean;
    screenStream: MediaStream | null;
    localStream: MediaStream | null;
    remoteStreamsMap: Map<string, MediaStream>;
    spotlightedUser: SessionParticipant | undefined | null;
    handleSpotlightAndSwitch: (id: string) => void;
    raisedHandQueue: User[];
    onWhiteboardControllerChange: (id: string) => void;
    whiteboardControllerId: string | null;
    allSessionUsers: SessionParticipant[];
    classOnlineIds: string[];
}

const useResponsiveGrid = (participantCount: number) => {
    return useMemo(() => {
        if (participantCount <= 4) return "grid-cols-1 sm:grid-cols-2";
        if (participantCount <= 9) return "grid-cols-2 sm:grid-cols-3 md:grid-cols-3";
        return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";
    }, [participantCount]);
};

const ParticipantCard = ({ 
    children, 
    className = "" 
}: { 
    children: React.ReactNode;
    className?: string;
}) => (
    <div className={cn(
        "aspect-video min-h-[120px] max-h-[200px] bg-card rounded-lg border overflow-hidden",
        "flex items-center justify-center relative shadow-sm",
        className
    )}>
        {children}
    </div>
);

// ✅ CORRECTION : typage propre + logique inchangée
const renderParticipant = (
    participant: SessionParticipant,
    props: RenderParticipantProps
): React.ReactElement | null => {
    if (!participant) return null;

    const {
        currentUserId,
        isSharingScreen,
        screenStream,
        localStream,
        remoteStreamsMap,
        spotlightedUser,
        handleSpotlightAndSwitch,
        raisedHandQueue,
        onWhiteboardControllerChange,
        whiteboardControllerId,
        allSessionUsers,
        classOnlineIds,
    } = props;

    const isSelf = participant.id === currentUserId;
    let stream: MediaStream | null = null;

    if (isSelf) {
        stream = isSharingScreen ? screenStream : localStream;
    } else {
        stream = remoteStreamsMap.get(participant.id) || null;
    }

    // ✅ Toujours afficher le professeur
    if (isSelf || (stream && stream.active)) {
        return (
            <Participant
                key={participant.id} 
                stream={stream} 
                isLocal={isSelf}
                isSpotlighted={participant.id === spotlightedUser?.id} 
                isTeacher={participant.role === Role.PROFESSEUR}
                participantUserId={participant.id} 
                onSpotlightParticipant={handleSpotlightAndSwitch}
                displayName={participant.name ?? ''} 
                isHandRaised={raisedHandQueue.some((u: User) => u.id === participant.id)}
                onSetWhiteboardController={onWhiteboardControllerChange} 
                isWhiteboardController={participant.id === whiteboardControllerId}
                compact={true}
            />
        );
    }
    
    const studentData = allSessionUsers.find((u: SessionParticipant) => u.id === participant.id) as User | undefined;
    if (!studentData) return null;

    return (
        <StudentPlaceholder
            key={participant.id} 
            student={studentData} 
            isOnline={classOnlineIds.includes(participant.id)}
            onSpotlightParticipant={handleSpotlightAndSwitch} 
            isHandRaised={raisedHandQueue.some((u: User) => u.id === participant.id)}
            compact={true}
        />
    );
};

const renderGridParticipant = (participant: SessionParticipant, props: RenderParticipantProps) => {
    const content = renderParticipant(participant, props);
    if (!content) return null;
    
    return (
        <ParticipantCard key={participant.id}>
            {content}
        </ParticipantCard>
    );
};

const getToolIcon = (tool: string) => {
    switch (tool) {
        case 'camera': return <Users className="h-4 w-4" />;
        case 'document': return <BookOpen className="h-4 w-4" />;
        case 'whiteboard': return <File className="h-4 w-4" />;
        case 'chat': return <MessageSquare className="h-4 w-4" />;
        case 'quiz': return <BarChart3 className="h-4 w-4" />;
        case 'breakout': return <Network className="h-4 w-4" />;
        default: return <Presentation className="h-4 w-4" />;
    }
};

const SidebarSection = ({ 
    title, 
    icon: Icon, 
    children, 
    isPrimary = false 
}: { 
    title: string; 
    icon: React.ElementType; 
    children: React.ReactNode; 
    isPrimary?: boolean; 
}) => (
    <div className={cn("space-y-3", isPrimary ? "pt-2" : "pt-4")}>
        <div className="flex items-center gap-2 px-2">
            <Icon className={cn("h-4 w-4", isPrimary ? "text-primary" : "text-muted-foreground")} />
            <h4 className={cn("font-medium text-sm", isPrimary ? "text-foreground" : "text-muted-foreground")}>
                {title}
            </h4>
        </div>
        {children}
    </div>
);

export function TeacherSessionView(props: TeacherSessionViewProps) {
    const { toast } = useToast();
    const [teacherView, setTeacherView] = useState<'content' | 'grid'>('content');
    const [isSidebarVisible, setIsSidebarVisible] = useState(true);
    const [showCelebration, setShowCelebration] = useState(false);
    const [celebrationData, setCelebrationData] = useState<{
      quizTitle: string;
      topStudents: { userId: string; name: string; score: number; rank: 1 | 2 | 3 }[];
    } | null>(null);
    
    const {
        sessionId, localStream, screenStream, remoteParticipants, spotlightedUser, allSessionUsers, 
        onlineUserIds: allOnlineUserIds, onSpotlightParticipant, raisedHandQueue, onAcknowledgeNextHand, 
        understandingStatus, currentUserId, isSharingScreen, activeTool, onToolChange, classroom, documentUrl, 
        onSelectDocument, whiteboardControllerId, onWhiteboardControllerChange, initialDuration, timerTimeLeft, 
        isTimerRunning, onStartTimer, onPauseTimer, onResetTimer, onWhiteboardEvent, whiteboardOperations, 
        flushWhiteboardOperations, documentHistory, onDocumentShared, activeQuiz, quizResponses, quizResults, 
        onStartQuiz, onEndQuiz, onCloseResults, students
    } = props;
    const teacher = useMemo(() => allSessionUsers.find(u => u.role === 'PROFESSEUR'), [allSessionUsers]);

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

    const allGridParticipants = useMemo(() => {
        const participantMap = new Map<string, SessionParticipant>();
        if (teacher) participantMap.set(teacher.id, teacher);
        students.forEach(student => {
            participantMap.set(student.id, student as SessionParticipant);
        });
        return Array.from(participantMap.values());
    }, [teacher, students]);

    const gridClass = useResponsiveGrid(allGridParticipants.length);

    const validatedTimerTimeLeft = useMemo(() => {
        const time = timerTimeLeft;
        if (typeof time !== 'number' || isNaN(time) || time < 0) return 0;
        return time;
    }, [timerTimeLeft]);

    const validatedInitialDuration = useMemo(() => {
        const duration = initialDuration;
        if (typeof duration !== 'number' || isNaN(duration) || duration < 0) return 600; 
        return duration;
    }, [initialDuration]);

    const remoteStreamsMap = useMemo(() => {
        const map = new Map<string, MediaStream>();
        remoteParticipants.forEach(p => { if (p.stream && p.stream.active) map.set(p.id, p.stream); });
        return map;
    }, [remoteParticipants]);

    const activeParticipantIds = useMemo(() => {
        const ids = new Set<string>([currentUserId]);
        remoteParticipants.forEach(p => ids.add(p.id));
        return Array.from(ids);
    }, [currentUserId, remoteParticipants]);
    
    const classOnlineIds = useMemo(() => allOnlineUserIds, [allOnlineUserIds]);

    const waitingCount = useMemo(() => {
        if (!classroom) return 0;
        return classroom.eleves.filter(student => classOnlineIds.includes(student.id) && !activeParticipantIds.includes(student.id)).length;
    }, [classOnlineIds, activeParticipantIds, classroom]);

    const handleSpotlightAndSwitch = useCallback((participantId: string) => {
        onSpotlightParticipant(participantId);
        onToolChange('camera');
        setTeacherView('content');
    }, [onSpotlightParticipant, onToolChange]);
    
    const handleSpotlightToggle = useCallback((participantId: string) => {
        const isAlreadySpotlighted = spotlightedUser?.id === participantId;
        const targetId = isAlreadySpotlighted ? currentUserId : participantId;
        onSpotlightParticipant(targetId);
        
        // Optionnel : s'assurer que la vue caméra est active
        if (activeTool !== 'camera') {
            onToolChange('camera');
        }
        if (teacherView !== 'content') {
            setTeacherView('content');
        }
    }, [spotlightedUser, currentUserId, onSpotlightParticipant, activeTool, onToolChange, teacherView]);

    const handleDocumentReshare = useCallback(async (doc: DocumentInHistory) => {
        try {
            await shareDocumentToStudents(sessionId, doc);
            onSelectDocument(doc);
            toast({ title: 'Document partagé !' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erreur de partage' });
        }
    }, [sessionId, onSelectDocument, toast]);

    const getSpotlightStream = useCallback(() => {
        if (!spotlightedUser) return null;
        let stream: MediaStream | null = (spotlightedUser.id === currentUserId) ? (isSharingScreen ? screenStream : localStream) : remoteStreamsMap.get(spotlightedUser.id) || null;
        return (stream && stream.active) ? stream : null;
    }, [spotlightedUser, currentUserId, isSharingScreen, screenStream, localStream, remoteStreamsMap]);

    const renderActiveTool = useMemo((): ReactNode => {
        switch (activeTool) {
            case 'camera':
                const spotlightStream = getSpotlightStream();
                if (spotlightStream && spotlightedUser) {
                    return (
                        <div className="w-full h-full relative bg-black rounded-lg overflow-hidden">
                            <Participant
                                className="w-full h-full"
                                stream={spotlightStream} 
                                isLocal={spotlightedUser.id === currentUserId} 
                                isSpotlighted={true} 
                                isTeacher={spotlightedUser.role === Role.PROFESSEUR} 
                                participantUserId={spotlightedUser.id} 
                                onSpotlightParticipant={onSpotlightParticipant} 
                                displayName={spotlightedUser.name ?? ''}
                            />
                        </div>
                    );
                }
                return (
                    <div className="h-full w-full flex items-center justify-center bg-muted/20 text-muted-foreground rounded-lg">
                        <div className="text-center">
                            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p className="text-lg font-medium">Aucun participant en vedette</p>
                            <p className="text-sm text-muted-foreground">Sélectionnez un participant dans la grille</p>
                        </div>
                    </div>
                );
            case 'document':
                return <DocumentViewer url={documentUrl} />;
            case 'whiteboard':
                return (
                    <div className="w-full h-full bg-white rounded-lg">
                        <Html5Whiteboard 
                            sessionId={sessionId} 
                            userId={currentUserId} 
                            isController={currentUserId === whiteboardControllerId} 
                            operations={whiteboardOperations} 
                            onEvent={onWhiteboardEvent} 
                            flushOperations={flushWhiteboardOperations} 
                        />
                    </div>
                );
            case 'chat':
                return classroom?.id ? (
                    <div className="w-full h-full rounded-lg border">
                        <ChatWorkspace classroomId={classroom.id} userId={currentUserId} userRole={Role.PROFESSEUR} />
                    </div>
                ) : null;
            case 'quiz':
                return (
                    <div className="w-full h-full rounded-lg border">
                        <QuizWorkspace 
                            sessionId={sessionId} 
                            activeQuiz={activeQuiz} 
                            quizResponses={quizResponses} 
                            quizResults={quizResults} 
                            onStartQuiz={onStartQuiz} 
                            onEndQuiz={onEndQuiz} 
                            onCloseResults={onCloseResults} 
                            students={students} 
                        />
                    </div>
                );
            case 'breakout':
                return (
                    <div className="w-full h-full rounded-lg border">
                        <BreakoutRoomsManager sessionId={sessionId} students={students} documentHistory={documentHistory} />
                    </div>
                );
            default:
                return (
                    <div className="h-full w-full flex items-center justify-center bg-muted/20 text-muted-foreground rounded-lg">
                        <div className="text-center">
                            <Presentation className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p className="text-lg font-medium">Outil non disponible</p>
                        </div>
                    </div>
                );
        }
    }, [
        activeTool, getSpotlightStream, spotlightedUser, currentUserId, onSpotlightParticipant, documentUrl,
        sessionId, whiteboardControllerId, whiteboardOperations, onWhiteboardEvent, flushWhiteboardOperations,
        classroom, students, activeQuiz, quizResponses, quizResults, onStartQuiz, onEndQuiz, onCloseResults, documentHistory
    ]);

    const renderMainContent = () => (
        <div className="flex flex-col h-full w-full rounded-lg border bg-card overflow-hidden">
            <div className="flex-shrink-0 flex items-center justify-between p-3 bg-background/70 backdrop-blur-sm border-b">
                <div className="flex items-center gap-2">
                    {getToolIcon(activeTool)}
                    <span className={cn(
                        "font-medium capitalize",
                        "px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20"
                    )}>
                        {activeTool === 'whiteboard' ? 'Tableau blanc' : 
                         activeTool === 'document' ? 'Document' : 
                         activeTool}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <ToggleGroup 
                        type="single" 
                        value={teacherView} 
                        onValueChange={(value) => value && setTeacherView(value as 'content' | 'grid')} 
                        className="bg-background/80 backdrop-blur-sm p-1 rounded-md border"
                    >
                        <ToggleGroupItem value="content" aria-label="Basculer vers la vue contenu" className="h-8 w-8">
                            <Presentation className="h-3.5 w-3.5" aria-hidden="true" />
                        </ToggleGroupItem>
                        <ToggleGroupItem value="grid" aria-label="Basculer vers la vue grille" className="h-8 w-8">
                            <Grid className="h-3.5 w-3.5" aria-hidden="true" />
                        </ToggleGroupItem>
                    </ToggleGroup>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setIsSidebarVisible(!isSidebarVisible)} 
                        className="h-8 w-8"
                        aria-label={isSidebarVisible ? "Masquer le panneau latéral" : "Afficher le panneau latéral"}
                    >
                        {isSidebarVisible ? <PanelRightClose className="h-3.5 w-3.5" aria-hidden="true" /> : <PanelRightOpen className="h-3.5 w-3.5" aria-hidden="true" />}
                    </Button>
                </div>
            </div>
            
            <div className="flex-1 min-h-0 overflow-hidden">
                {teacherView === 'content' ? (
                    <div className="w-full h-full">
                        {renderActiveTool}
                    </div>
                ) : (
                    <ScrollArea className="h-full w-full" type="always">
                        <div className={cn(
                            "grid gap-3 auto-rows-fr p-3",
                            gridClass
                        )}>
                            {allGridParticipants.map(p => renderGridParticipant(p, {
                                currentUserId, 
                                isSharingScreen, 
                                screenStream, 
                                localStream, 
                                remoteStreamsMap,
                                spotlightedUser, 
                                handleSpotlightAndSwitch, 
                                raisedHandQueue, 
                                onWhiteboardControllerChange, 
                                whiteboardControllerId, 
                                allSessionUsers, 
                                classOnlineIds
                            } as RenderParticipantProps))}
                        </div>
                    </ScrollArea>
                )}
            </div>
        </div>
    );

    if (!currentUserId || !teacher) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="animate-spin h-8 w-8" />
            </div>
        );
    }

    return (
        <div className="flex-1 flex min-h-0 gap-4">
            {showCelebration && celebrationData && (
              <QuizResultsCelebration
                quizTitle={celebrationData.quizTitle}
                topStudents={celebrationData.topStudents}
                onClose={() => setShowCelebration(false)}
              />
            )}

            <div className="flex-1 flex flex-col min-h-0 min-w-0">
                {renderMainContent()}
            </div>
            
            <AnimatePresence>
                {isSidebarVisible && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 360, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="flex-shrink-0"
                    >
                        <ScrollArea className="h-full pr-2 -mr-2">
                            <div className="space-y-5 p-3">
                                <SidebarSection 
                                    title="Partage de Document" 
                                    icon={BookOpen} 
                                    isPrimary={true}
                                >
                                    <div className='space-y-3'>
                                        <DocumentUploadSection sessionId={sessionId} onUploadSuccess={onDocumentShared} />
                                        <DocumentHistory
                                            documents={documentHistory}
                                            onSelectDocument={onSelectDocument}
                                            onReshare={handleDocumentReshare}
                                            sessionId={sessionId}
                                            currentUserId={currentUserId}
                                        />
                                    </div>
                                </SidebarSection>
                                
                                <SidebarSection title="Sondage de Compréhension" icon={BarChart3}>
                                    <QuickPollResults students={students} understandingStatus={understandingStatus} />
                                </SidebarSection>
                                
                                <SidebarSection title="Mains Levées" icon={Hand}>
                                    <HandRaiseController raisedHandQueue={raisedHandQueue} onAcknowledgeNext={onAcknowledgeNextHand} /> 
                                </SidebarSection>
                                
                                <SidebarSection title="Gestion de Session" icon={Timer}>
                                    <div className="space-y-3">
                                        <SessionTimer
                                            isTeacher={true} 
                                            sessionId={sessionId} 
                                            initialDuration={validatedInitialDuration}
                                            timeLeft={validatedTimerTimeLeft} 
                                            isTimerRunning={isTimerRunning}
                                            onStart={onStartTimer} 
                                            onPause={onPauseTimer} 
                                            onReset={onResetTimer}
                                        />
                                        <SessionStatus
                                            participants={allSessionUsers as User[]} 
                                            onlineIds={activeParticipantIds}
                                            webrtcConnections={remoteParticipants.length} 
                                            whiteboardControllerId={whiteboardControllerId}
                                        />
                                    </div>
                                </SidebarSection>
                                
                                {classroom && (
                                    <SidebarSection title="Élèves" icon={Users}>
                                        <ClassStudentList
                                            classroom={classroom} 
                                            onlineUserIds={classOnlineIds} 
                                            currentUserId={currentUserId}
                                            activeParticipantIds={activeParticipantIds} 
                                            sessionId={sessionId} 
                                            waitingStudentCount={waitingCount}
                                            onSpotlightParticipant={handleSpotlightToggle} 
                                            spotlightedParticipantId={spotlightedUser?.id || null}
                                            whiteboardControllerId={whiteboardControllerId} 
                                            onWhiteboardControllerChange={onWhiteboardControllerChange}
                                        />
                                    </SidebarSection>
                                )}
                            </div>
                        </ScrollArea>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ✅ Interface props pour le composant principal
interface TeacherSessionViewProps {
    sessionId: string;
    localStream: MediaStream | null;
    screenStream: MediaStream | null;
    remoteParticipants: { id: string; stream: MediaStream; }[];
    spotlightedUser: SessionParticipant | undefined | null;
    allSessionUsers: SessionParticipant[];
    onlineUserIds: string[];
    onSpotlightParticipant: (participantId: string) => void;
    raisedHandQueue: User[];
    onAcknowledgeNextHand: () => void;
    understandingStatus: Map<string, ComprehensionLevel>;
    currentUserId: string;
    isSharingScreen: boolean;
    activeTool: string;
    onToolChange: (tool: string) => void;
    classroom: ClassroomWithDetails | null;
    documentUrl: string | null;
    onSelectDocument: (doc: DocumentInHistory) => void;
    whiteboardControllerId: string | null;
    onWhiteboardControllerChange: (userId: string) => void;
    initialDuration: number;
    timerTimeLeft: number;
    isTimerRunning: boolean;
    onStartTimer: () => void;
    onPauseTimer: () => void;
    onResetTimer: (newDuration?: number) => void;
    onWhiteboardEvent: (event: WhiteboardOperation[]) => void;
    whiteboardOperations: WhiteboardOperation[];
    flushWhiteboardOperations?: () => void;
    documentHistory: DocumentInHistory[];
    onDocumentShared: (doc: { name: string; url: string }) => void;
    activeQuiz: QuizWithQuestions | null; // CORRECTION: Utiliser QuizWithQuestions
    quizResponses: Map<string, QuizResponse>;
    quizResults: QuizResults | null;
    onStartQuiz: (quiz: CreateQuizData) => Promise<{ success: boolean; error?: string; }>;
    onEndQuiz: (quizId: string, responses: Map<string, QuizResponse>) => Promise<{ success: boolean; }>;
    onCloseResults: () => void;
    students: User[];
}