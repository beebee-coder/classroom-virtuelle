// src/components/session/TeacherSessionView.tsx
'use client';

import React, { useState, type ReactNode, useEffect, useMemo, useCallback } from 'react';
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
import { ChatSheet } from '../ChatSheet';
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


// Définition des props pour TeacherSessionView
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
    students: User[];
}

// Composant pour le contenu principal
const TeacherMainContent: React.FC<{
    teacherView: 'content' | 'grid';
    allGridParticipants: SessionParticipant[];
    renderParticipant: (participant: SessionParticipant) => ReactNode;
    renderActiveTool: ReactNode;
}> = ({ teacherView, allGridParticipants, renderParticipant, renderActiveTool }) => (
    <div className="absolute inset-0 rounded-lg border bg-card p-4">
        {teacherView === 'content' ? (
          renderActiveTool
        ) : (
          <ScrollArea className="h-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {allGridParticipants.map(p => renderParticipant(p))}
            </div>
          </ScrollArea>
        )}
    </div>
);

// Composant pour la barre latérale
const TeacherSidebar: React.FC<{
    sessionId: string;
    onDocumentShared: (doc: { name: string; url: string }) => void;
    documentHistory: DocumentInHistory[];
    onSelectDocument: (doc: DocumentInHistory) => void;
    handleDocumentReshare: (doc: DocumentInHistory) => void;
    currentUserId: string;
    validatedInitialDuration: number;
    validatedTimerTimeLeft: number;
    isTimerRunning: boolean;
    onStartTimer: () => void;
    onPauseTimer: () => void;
    onResetTimer: (newDuration?: number) => void;
    allSessionUsers: SessionParticipant[];
    activeParticipantIds: string[];
    remoteParticipants: { id: string; stream: MediaStream; }[];
    whiteboardControllerId: string | null;
    classroom: ClassroomWithDetails | null;
    classOnlineIds: string[];
    waitingCount: number;
    onSpotlightParticipant: (participantId: string) => void;
    spotlightedUser: SessionParticipant | null | undefined;
    onWhiteboardControllerChange: (userId: string) => void;
    students: User[];
    understandingStatus: Map<string, ComprehensionLevel>;
    raisedHandQueue: User[];
    onAcknowledgeNextHand: () => void;
}> = (props) => (
    <ScrollArea className="h-full pr-3 -mr-3">
        <div className="space-y-4">
            <AnimatedCard title="Partage de Document">
                <div className='p-4 space-y-3'>
                    <DocumentUploadSection sessionId={props.sessionId} onUploadSuccess={props.onDocumentShared} />
                    <DocumentHistory
                        documents={props.documentHistory}
                        onSelectDocument={props.onSelectDocument}
                        onReshare={props.handleDocumentReshare}
                        sessionId={props.sessionId}
                        currentUserId={props.currentUserId}
                    />
                </div>
            </AnimatedCard>
            <AnimatedCard title="Gestion de Session">
                <div className="space-y-3 p-4">
                    <SessionTimer
                        isTeacher={true}
                        sessionId={props.sessionId}
                        initialDuration={props.validatedInitialDuration}
                        timeLeft={props.validatedTimerTimeLeft}
                        isTimerRunning={props.isTimerRunning}
                        onStart={props.onStartTimer}
                        onPause={props.onPauseTimer}
                        onReset={props.onResetTimer}
                    />
                    <SessionStatus
                        participants={props.allSessionUsers as User[]}
                        onlineIds={props.activeParticipantIds}
                        webrtcConnections={props.remoteParticipants.length}
                        whiteboardControllerId={props.whiteboardControllerId}
                    />
                </div>
            </AnimatedCard>
            {props.classroom && (
                 <ClassStudentList
                    classroom={props.classroom}
                    onlineUserIds={props.classOnlineIds}
                    currentUserId={props.currentUserId}
                    activeParticipantIds={props.activeParticipantIds}
                    sessionId={props.sessionId}
                    waitingStudentCount={props.waitingCount}
                    onSpotlightParticipant={props.onSpotlightParticipant}
                    spotlightedParticipantId={props.spotlightedUser?.id || null}
                    whiteboardControllerId={props.whiteboardControllerId}
                    onWhiteboardControllerChange={props.onWhiteboardControllerChange}
                />
            )}
            <AnimatedCard title="Sondage de Compréhension">
                <QuickPollResults students={props.students} understandingStatus={props.understandingStatus} />
            </AnimatedCard>
            <AnimatedCard title="Mains Levées">
                <HandRaiseController raisedHandQueue={props.raisedHandQueue} onAcknowledgeNext={props.onAcknowledgeNextHand} />
            </AnimatedCard>
        </div>
    </ScrollArea>
);


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
        onStartQuiz, onEndQuiz, students
    } = props;

    const validatedTimerTimeLeft = useMemo(() => {
        const time = timerTimeLeft;
        if (typeof time !== 'number' || isNaN(time) || time < 0) {
            console.warn('Invalid timerTimeLeft value detected, using default:', time);
            return 0;
        }
        return time;
    }, [timerTimeLeft]);

    const validatedInitialDuration = useMemo(() => {
        const duration = initialDuration;
        if (typeof duration !== 'number' || isNaN(duration) || duration < 0) {
            console.warn('Invalid initialDuration value detected, using default:', duration);
            return 600; 
        }
        return duration;
    }, [initialDuration]);

    const remoteStreamsMap = useMemo(() => new Map(remoteParticipants.map(p => [p.id, p.stream])), [remoteParticipants]);
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

    const handleSpotlightAndSwitch = useCallback(async (participantId: string) => {
        try {
            await spotlightParticipant(sessionId, participantId);
            onToolChange('camera');
            setTeacherView('content');
        } catch (error) {
            console.error('Failed to spotlight participant', error);
            toast({
                variant: "destructive",
                title: "Erreur",
                description: "Impossible de mettre le participant en vedette.",
            });
        }
    }, [onToolChange, sessionId, toast]);

    const handleDocumentReshare = useCallback(async (doc: DocumentInHistory) => {
        try {
            console.log('📤 [TEACHER VIEW] - Partage du document aux élèves:', doc.name);
            await shareDocumentToStudents(sessionId, doc);
            onSelectDocument(doc);
            toast({ title: 'Document partagé !', description: `"${doc.name}" est maintenant affiché et partagé aux élèves.` });
        } catch (error) {
            console.error('❌ [TEACHER VIEW] - Erreur lors du partage du document:', error);
            toast({ variant: 'destructive', title: 'Erreur de partage', description: "Impossible de partager le document aux élèves." });
        }
    }, [sessionId, onSelectDocument, toast]);

    const renderParticipant = useCallback((participant: SessionParticipant) => {
        if (!participant) return null;
        const stream = participant.id === teacher?.id ? (isSharingScreen ? screenStream : localStream) : remoteStreamsMap.get(participant.id);
        const key = participant.id;

        if (stream) {
            return (
                <Participant
                    key={key} stream={stream} isLocal={participant.id === currentUserId}
                    isSpotlighted={participant.id === spotlightedUser?.id} isTeacher={true}
                    participantUserId={participant.id} onSpotlightParticipant={handleSpotlightAndSwitch}
                    displayName={participant.name ?? ''} isHandRaised={raisedHandQueue.some(u => u.id === participant.id)}
                    onSetWhiteboardController={onWhiteboardControllerChange} isWhiteboardController={participant.id === whiteboardControllerId}
                />
            );
        }
        
        const studentData = allSessionUsers.find(u => u.id === participant.id) as User | undefined;
        if (!studentData) return null;

        return (
            <StudentPlaceholder
                key={key} student={studentData} isOnline={classOnlineIds.includes(participant.id)}
                onSpotlightParticipant={handleSpotlightAndSwitch} isHandRaised={raisedHandQueue.some(u => u.id === participant.id)}
            />
        );
    }, [
        teacher?.id, localStream, remoteStreamsMap, currentUserId, spotlightedUser?.id, handleSpotlightAndSwitch, 
        raisedHandQueue, onWhiteboardControllerChange, whiteboardControllerId, classOnlineIds, isSharingScreen, screenStream, allSessionUsers
    ]);
    
    const allGridParticipants = useMemo(() => {
        const participantMap = new Map<string, SessionParticipant>();
        if (teacher) participantMap.set(teacher.id, teacher);
        if (classroom?.eleves) classroom.eleves.forEach(student => { if (!participantMap.has(student.id)) participantMap.set(student.id, student as SessionParticipant); });
        return Array.from(participantMap.values());
    }, [teacher, classroom?.eleves]);

    const renderActiveTool = useMemo(() => {
        if (isSharingScreen && screenStream) {
            return <div className="w-full h-full bg-black rounded-lg overflow-hidden"><Participant stream={screenStream} isLocal={true} isTeacher={true} participantUserId={currentUserId} displayName="Votre partage d'écran" /></div>;
        }
        const spotlightedStream = spotlightedUser?.id === currentUserId ? (isSharingScreen ? screenStream : localStream) : remoteStreamsMap.get(spotlightedUser?.id ?? '');
        switch(activeTool) {
            case 'document': return <div className="h-full w-full rounded-lg overflow-hidden"><DocumentViewer url={documentUrl} /></div>;
            case 'whiteboard': return <div className="h-full w-full relative rounded-lg overflow-hidden"><div className="absolute top-2 left-2 z-10 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">👨‍🏫 Vous contrôlez le tableau</div><Html5Whiteboard sessionId={sessionId} userId={currentUserId} isController={currentUserId === whiteboardControllerId} operations={whiteboardOperations} onEvent={onWhiteboardEvent} flushOperations={flushWhiteboardOperations} /></div>;
            case 'quiz': return <QuizWorkspace sessionId={sessionId} activeQuiz={activeQuiz} quizResponses={quizResponses} quizResults={quizResults} onStartQuiz={onStartQuiz} onEndQuiz={(quizId: string) => onEndQuiz(quizId, quizResponses)} students={students} />;
            case 'chat': return <div className="h-full w-full rounded-lg overflow-hidden">{classroom?.id && teacher?.id && teacher.role && <ChatSheet classroomId={classroom.id} userId={teacher.id} userRole={teacher.role} />}</div>;
            case 'breakout': return <BreakoutRoomsManager sessionId={sessionId} students={students.filter(s => allOnlineUserIds.includes(s.id))} />;
            case 'camera':
                if (!spotlightedUser) return <Card className="h-full w-full flex flex-col items-center justify-center bg-muted/30 border-dashed rounded-lg"><CardContent className="text-center text-muted-foreground p-6"><Users className="h-10 w-10 mx-auto mb-4" /><h3 className="font-semibold text-xl">Aucun participant en vedette</h3><p className="text-sm mt-2">Sélectionnez un participant dans la liste pour le mettre en vedette.</p><Button variant="outline" onClick={() => setTeacherView('grid')} className="mt-4">Voir tous les participants</Button></CardContent></Card>;
                if (!spotlightedStream) return <Card className="h-full w-full flex flex-col items-center justify-center bg-muted/30 border-dashed rounded-lg"><CardContent className="text-center text-muted-foreground p-6"><Loader2 className="h-10 w-10 mx-auto mb-4 animate-spin" /><h3 className="font-semibold text-xl">Connexion à {spotlightedUser.name}...</h3></CardContent></Card>;
                return <div className="w-full h-full bg-black rounded-lg overflow-hidden"><Participant stream={spotlightedStream} isLocal={spotlightedUser.id === currentUserId} isSpotlighted={true} isTeacher={true} participantUserId={spotlightedUser.id} onSpotlightParticipant={onSpotlightParticipant} displayName={spotlightedUser.name ?? ''} isHandRaised={raisedHandQueue.some(u => u.id === spotlightedUser.id)} onSetWhiteboardController={onWhiteboardControllerChange} isWhiteboardController={spotlightedUser.id === whiteboardControllerId} /></div>;
            default: return <Card className="h-full w-full flex flex-col items-center justify-center bg-muted/30 border-dashed rounded-lg"><CardContent className="text-center text-muted-foreground p-6"><File className="h-10 w-10 mx-auto mb-4" /><h3 className="font-semibold text-xl">Outils d'enseignement</h3><p className="text-sm mt-2">Utilisez le menu pour sélectionner un outil disponible.</p><div className="flex gap-2 mt-4"><Button variant="outline" onClick={() => onToolChange('document')}>Documents</Button><Button variant="outline" onClick={() => onToolChange('camera')}>Caméra</Button></div></CardContent></Card>;
        }
    }, [
        activeTool, isSharingScreen, screenStream, currentUserId, documentUrl, onWhiteboardControllerChange, whiteboardControllerId, classroom?.id, 
        teacher?.id, teacher?.role, onToolChange, spotlightedUser, localStream, remoteStreamsMap, onSpotlightParticipant, raisedHandQueue, 
        sessionId, whiteboardOperations, onWhiteboardEvent, flushWhiteboardOperations, activeQuiz, quizResponses, quizResults, 
        onStartQuiz, onEndQuiz, students, allOnlineUserIds
    ]);
    
    if (!currentUserId || !teacher) return <div className="flex-1 flex items-center justify-center"><div className="text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto" /><p className="mt-2">Chargement de la session...</p></div></div>;

    const sidebarProps = {
        sessionId, onDocumentShared, documentHistory, onSelectDocument, handleDocumentReshare, currentUserId,
        validatedInitialDuration, validatedTimerTimeLeft, isTimerRunning, onStartTimer, onPauseTimer, onResetTimer,
        allSessionUsers, activeParticipantIds, remoteParticipants, whiteboardControllerId, classroom, classOnlineIds,
        waitingCount, onSpotlightParticipant, spotlightedUser, onWhiteboardControllerChange, students, understandingStatus,
        raisedHandQueue, onAcknowledgeNextHand
    };

    const mainContentProps = {
        teacherView, allGridParticipants, renderParticipant, renderActiveTool
    };

    return (
      <div className="flex-1 flex min-h-0 gap-4 p-4">
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <div className="flex-1 min-h-0 relative">
            <TeacherMainContent {...mainContentProps} />
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
                    <TeacherSidebar {...sidebarProps} />
                 </motion.div>
            )}
        </AnimatePresence>
      </div>
    );
}
