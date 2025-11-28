// src/components/session/TeacherSessionView.tsx - VERSION COMPLÈTE CORRIGÉE
'use client';

import React, { useState, type ReactNode, useEffect, useMemo, useCallback, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Role } from '@prisma/client';
import type { SessionParticipant, ClassroomWithDetails, DocumentInHistory, Html5CanvasScene, ComprehensionLevel, WhiteboardOperation, Quiz, QuizResponse, QuizResults } from '@/types';
import { Participant } from '@/components/Participant';
import { StudentPlaceholder } from '../StudentPlaceholder';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ClassStudentList } from './ClassStudentList';
import { Loader2, UploadCloud, File, Trash2, Share2, Award, Users, Grid, Presentation, MessageSquare, PanelRightOpen, PanelRightClose, Network } from 'lucide-react';
import { Button } from '../ui/button';
import { SessionStatus } from './SessionStatus';
import { cn } from '@/lib/utils';
import { ChatWorkspace } from './ChatWorkspace';
import { Html5Whiteboard } from '@/components/Html5Whiteboard';
import { AnimatedCard } from './AnimatedCard';
import { useToast } from '@/hooks/use-toast';
import { DocumentUploadSection } from './DocumentUploadSection';
import { shareDocumentToStudents, spotlightParticipant } from '@/lib/actions/session.actions';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { motion, AnimatePresence } from 'framer-motion';
import { QuizWorkspace } from './quiz/QuizWorkspace';
import { BreakoutRoomsManager } from './breakout/BreakoutRoomsManager';
import { QuickPollResults } from './QuickPollResults';
import { HandRaiseController } from './HandRaiseController';
import { SessionTimer } from './SessionTimer';
import { DocumentHistory } from './DocumentHistory';
import { DocumentViewer } from './DocumentViewer';
import type { CreateQuizData } from '@/lib/actions/ably-session.actions';

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
    activeQuiz: Quiz | null;
    quizResponses: Map<string, QuizResponse>;
    quizResults: QuizResults | null;
    onStartQuiz: (quiz: CreateQuizData) => Promise<{ success: boolean; error?: string; }>;
    onEndQuiz: (quizId: string, responses: Map<string, QuizResponse>) => Promise<{ success: boolean; }>;
    onCloseResults: () => void;
    students: User[];
}

// ✅ NOUVEAU : Hook de grille responsive
const useResponsiveGrid = (participantCount: number) => {
    return useMemo(() => {
        if (participantCount <= 4) return "grid-cols-1 sm:grid-cols-2";
        if (participantCount <= 9) return "grid-cols-2 sm:grid-cols-3 md:grid-cols-3";
        return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";
    }, [participantCount]);
};

// ✅ NOUVEAU : Composant ParticipantCard encapsulé
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

const renderParticipant = (
    participant: SessionParticipant,
    {
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
    }: any
): React.ReactElement | null => {
    if (!participant) return null;

    let stream: MediaStream | null = null;

    if (participant.id === currentUserId) {
        stream = isSharingScreen ? screenStream : localStream;
    } else {
        stream = remoteStreamsMap.get(participant.id) || null;
    }

    const key = participant.id;

    if (stream && stream.active) {
        return (
            <Participant
                key={key} 
                stream={stream} 
                isLocal={participant.id === currentUserId}
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
            key={key} 
            student={studentData} 
            isOnline={classOnlineIds.includes(participant.id)}
            onSpotlightParticipant={handleSpotlightAndSwitch} 
            isHandRaised={raisedHandQueue.some((u: User) => u.id === participant.id)}
            compact={true}
        />
    );
};

export function TeacherSessionView(props: TeacherSessionViewProps) {
    const { toast } = useToast();
    const [teacherView, setTeacherView] = useState<'content' | 'grid'>('content');
    const [isSidebarVisible, setIsSidebarVisible] = useState(true);
    
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

    // ✅ CORRECTION : Grille responsive dynamique
    const allGridParticipants = useMemo(() => {
        const participantMap = new Map<string, SessionParticipant>();
        if (teacher) participantMap.set(teacher.id, teacher); // ✅ Maintenant teacher est déclaré
        if (classroom?.eleves) classroom.eleves.forEach(student => { 
            if (!participantMap.has(student.id)) participantMap.set(student.id, student as SessionParticipant); 
        });
        return Array.from(participantMap.values());
    }, [teacher, classroom?.eleves]);

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

    const handleDocumentReshare = useCallback(async (doc: DocumentInHistory) => {
        try {
            await shareDocumentToStudents(sessionId, doc);
            onSelectDocument(doc);
            toast({ title: 'Document partagé !' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erreur de partage' });
        }
    }, [sessionId, onSelectDocument, toast]);

    // ✅ CORRECTION : Render participant avec conteneur contrôlé
    const renderGridParticipant = (participant: SessionParticipant, props: any) => {
        const content = renderParticipant(participant, props);
        if (!content) return null;
        
        return (
            <ParticipantCard key={participant.id}>
                {content}
            </ParticipantCard>
        );
    };

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

    // ✅ CORRECTION : Conteneur principal simplifié pour le mode plein écran
    const renderMainContent = () => (
        <div className="absolute inset-0 rounded-lg border bg-card overflow-hidden flex flex-col">
            {/* En-tête avec contrôles - garder le header */}
            <div className="flex-shrink-0 flex justify-between items-center p-4 bg-card border-b">
                <h3 className="font-semibold text-lg">
                    {teacherView === 'content' 
                        ? `Vue Contenu - ${activeTool.charAt(0).toUpperCase() + activeTool.slice(1)}` 
                        : `Vue Grille (${allGridParticipants.length} participants)`
                    }
                </h3>
                <div className="flex items-center gap-2">
                    <ToggleGroup 
                        type="single" 
                        value={teacherView} 
                        onValueChange={(value) => value && setTeacherView(value as 'content' | 'grid')} 
                        className="bg-background/80 backdrop-blur-sm p-1 rounded-lg border"
                    >
                        <ToggleGroupItem value="content" aria-label="Vue Contenu">
                            <Presentation className="h-4 w-4" />
                        </ToggleGroupItem>
                        <ToggleGroupItem value="grid" aria-label="Vue Grille">
                            <Grid className="h-4 w-4" />
                        </ToggleGroupItem>
                    </ToggleGroup>
                    <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => setIsSidebarVisible(!isSidebarVisible)} 
                        className="h-9 w-9 bg-background/80 backdrop-blur-sm"
                    >
                        {isSidebarVisible ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
            
            {/* ✅ CORRECTION : Zone de contenu sans padding supplémentaire */}
            <div className="flex-1 min-h-0 overflow-hidden">
                {teacherView === 'content' ? (
                    // ✅ CORRECTION : Vue contenu en plein écran
                    <div className="w-full h-full">
                        {renderActiveTool}
                    </div>
                ) : (
                    // Vue grille inchangée
                    <ScrollArea className="h-full w-full" type="always">
                        <div className={cn(
                            "grid gap-3 auto-rows-fr p-4",
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
                            }))}
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
        <div className="flex-1 flex min-h-0 gap-4 p-4">
            {/* Conteneur principal */}
            <div className="flex-1 flex flex-col min-h-0 min-w-0 relative">
                {renderMainContent()}
            </div>
            
            {/* Sidebar */}
            <AnimatePresence>
                {isSidebarVisible && (
                    <motion.div
                        initial={{ width: 0, opacity: 0, x: 50 }}
                        animate={{ width: 400, opacity: 1, x: 0 }}
                        exit={{ width: 0, opacity: 0, x: 50 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="flex-shrink-0"
                    >
                        <ScrollArea className="h-full pr-3 -mr-3">
                            <div className="space-y-4">
                                <AnimatedCard title="Partage de Document">
                                    <div className='p-4 space-y-3'>
                                        <DocumentUploadSection sessionId={sessionId} onUploadSuccess={onDocumentShared} />
                                        <DocumentHistory
                                            documents={documentHistory}
                                            onSelectDocument={onSelectDocument}
                                            onReshare={handleDocumentReshare}
                                            sessionId={sessionId}
                                            currentUserId={currentUserId}
                                        />
                                    </div>
                                </AnimatedCard>
                                
                                <AnimatedCard title="Gestion de Session">
                                    <div className="space-y-3 p-4">
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
                                </AnimatedCard>
                                
                                {classroom && (
                                    <ClassStudentList
                                        classroom={classroom} 
                                        onlineUserIds={classOnlineIds} 
                                        currentUserId={currentUserId}
                                        activeParticipantIds={activeParticipantIds} 
                                        sessionId={sessionId} 
                                        waitingStudentCount={waitingCount}
                                        onSpotlightParticipant={onSpotlightParticipant} 
                                        spotlightedParticipantId={spotlightedUser?.id || null}
                                        whiteboardControllerId={whiteboardControllerId} 
                                        onWhiteboardControllerChange={onWhiteboardControllerChange}
                                    />
                                )}
                                
                                <AnimatedCard title="Sondage de Compréhension">
                                    <QuickPollResults students={students} understandingStatus={understandingStatus} />
                                </AnimatedCard>
                                
                                <AnimatedCard title="Mains Levées">
                                    <HandRaiseController raisedHandQueue={raisedHandQueue} onAcknowledgeNext={onAcknowledgeNextHand} /> 
                                </AnimatedCard>
                            </div>
                        </ScrollArea>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
