
// src/components/session/TeacherSessionView.tsx - VERSION CORRIGÉE AVEC HOT RELOAD
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
): React.ReactElement | null => { // ✅ CORRECTION: Type de retour explicite
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
                isHandRaised={raisedHandQueue.some((u: User) => u.id === participant.id)} // ✅ CORRECTION: Type explicite
                onSetWhiteboardController={onWhiteboardControllerChange} 
                isWhiteboardController={participant.id === whiteboardControllerId}
            />
        );
    }
    
    const studentData = allSessionUsers.find((u: SessionParticipant) => u.id === participant.id) as User | undefined; // ✅ CORRECTION: Type explicite
    if (!studentData) return null;

    return (
        <StudentPlaceholder
            key={key} 
            student={studentData} 
            isOnline={classOnlineIds.includes(participant.id)}
            onSpotlightParticipant={handleSpotlightAndSwitch} 
            isHandRaised={raisedHandQueue.some((u: User) => u.id === participant.id)} // ✅ CORRECTION: Type explicite
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

    const teacher = useMemo(() => allSessionUsers.find(u => u.role === 'PROFESSEUR'), [allSessionUsers]);

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

    const allGridParticipants = useMemo(() => {
        const participantMap = new Map<string, SessionParticipant>();
        if (teacher) participantMap.set(teacher.id, teacher);
        if (classroom?.eleves) classroom.eleves.forEach(student => { 
            if (!participantMap.has(student.id)) participantMap.set(student.id, student as SessionParticipant); 
        });
        return Array.from(participantMap.values());
    }, [teacher, classroom?.eleves]);

    const getSpotlightStream = useCallback(() => {
        if (!spotlightedUser) return null;
        let stream: MediaStream | null = (spotlightedUser.id === currentUserId) ? (isSharingScreen ? screenStream : localStream) : remoteStreamsMap.get(spotlightedUser.id) || null;
        return (stream && stream.active) ? stream : null;
    }, [spotlightedUser, currentUserId, isSharingScreen, screenStream, localStream, remoteStreamsMap]);

    const renderActiveTool = useMemo((): ReactNode => { // ✅ CORRECTION: Type de retour explicite
        switch (activeTool) {
            case 'camera':
                const spotlightStream = getSpotlightStream();
                if (spotlightStream && spotlightedUser) {
                    return <Participant stream={spotlightStream} isLocal={spotlightedUser.id === currentUserId} isSpotlighted={true} isTeacher={spotlightedUser.role === Role.PROFESSEUR} participantUserId={spotlightedUser.id} onSpotlightParticipant={onSpotlightParticipant} displayName={spotlightedUser.name ?? ''} />;
                }
                return <div className="h-full w-full flex items-center justify-center bg-muted text-muted-foreground"><p>Aucun participant en vedette ou flux indisponible.</p></div>;
            case 'document':
                return <DocumentViewer url={documentUrl} />;
            case 'whiteboard':
                return <Html5Whiteboard sessionId={sessionId} userId={currentUserId} isController={currentUserId === whiteboardControllerId} operations={whiteboardOperations} onEvent={onWhiteboardEvent} flushOperations={flushWhiteboardOperations} />;
            case 'chat':
                return classroom?.id ? <ChatWorkspace classroomId={classroom.id} userId={currentUserId} userRole={Role.PROFESSEUR} /> : null;
            case 'quiz':
                return <QuizWorkspace sessionId={sessionId} activeQuiz={activeQuiz} quizResponses={quizResponses} quizResults={quizResults} onStartQuiz={onStartQuiz} onEndQuiz={onEndQuiz} onCloseResults={onCloseResults} students={students} />;
            case 'breakout':
                return <BreakoutRoomsManager sessionId={sessionId} students={students} />;
            default:
                return null;
        }
    }, [
        activeTool, getSpotlightStream, spotlightedUser, currentUserId, onSpotlightParticipant, documentUrl,
        sessionId, whiteboardControllerId, whiteboardOperations, onWhiteboardEvent, flushWhiteboardOperations,
        classroom, students, activeQuiz, quizResponses, quizResults, onStartQuiz, onEndQuiz, onCloseResults
    ]);
    
    if (!currentUserId || !teacher) return <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>;

    const renderParticipantProps = {
        currentUserId, isSharingScreen, screenStream, localStream, remoteStreamsMap,
        spotlightedUser, handleSpotlightAndSwitch, raisedHandQueue, 
        onWhiteboardControllerChange, whiteboardControllerId, allSessionUsers, classOnlineIds
    };

    return (
      <div className="flex-1 flex min-h-0 gap-4 p-4">
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <div className="flex-1 min-h-0 relative">
            <div className="absolute inset-0 rounded-lg border bg-card p-4">
                {teacherView === 'content' ? ( // ✅ CORRECTION: renderActiveTool est maintenant un ReactNode
                  renderActiveTool
                ) : (
                  <ScrollArea className="h-full">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {allGridParticipants.map(p => renderParticipant(p, renderParticipantProps))}
                    </div>
                  </ScrollArea>
                )}
            </div>
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                <ToggleGroup type="single" value={teacherView} onValueChange={(value) => value && setTeacherView(value as 'content' | 'grid')} className="bg-background/80 backdrop-blur-sm p-1 rounded-lg border">
                    <ToggleGroupItem value="content" aria-label="Vue Contenu"><Presentation className="h-4 w-4" /></ToggleGroupItem>
                    <ToggleGroupItem value="grid" aria-label="Vue Grille"><Grid className="h-4 w-4" /></ToggleGroupItem>
                </ToggleGroup>
                <Button variant="outline" size="icon" onClick={() => setIsSidebarVisible(!isSidebarVisible)} className="h-9 w-9 bg-background/80 backdrop-blur-sm">
                    {isSidebarVisible ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                </Button>
            </div>
          </div>
        </div>
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
                                        isTeacher={true} sessionId={sessionId} initialDuration={validatedInitialDuration}
                                        timeLeft={validatedTimerTimeLeft} isTimerRunning={isTimerRunning}
                                        onStart={onStartTimer} onPause={onPauseTimer} onReset={onResetTimer}
                                    />
                                    <SessionStatus
                                        participants={allSessionUsers as User[]} onlineIds={activeParticipantIds}
                                        webrtcConnections={remoteParticipants.length} whiteboardControllerId={whiteboardControllerId}
                                    />
                                </div>
                            </AnimatedCard>
                            {classroom && (
                                 <ClassStudentList
                                    classroom={classroom} onlineUserIds={classOnlineIds} currentUserId={currentUserId}
                                    activeParticipantIds={activeParticipantIds} sessionId={sessionId} waitingStudentCount={waitingCount}
                                    onSpotlightParticipant={onSpotlightParticipant} spotlightedParticipantId={spotlightedUser?.id || null}
                                    whiteboardControllerId={whiteboardControllerId} onWhiteboardControllerChange={onWhiteboardControllerChange}
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
