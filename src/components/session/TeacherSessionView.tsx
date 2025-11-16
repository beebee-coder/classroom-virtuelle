// src/components/session/TeacherSessionView.tsx
import { DocumentUploadSection } from './DocumentUploadSection';

import React, { useState, type ReactNode, useEffect, useMemo, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Role } from '@prisma/client';
import type { SessionParticipant, ClassroomWithDetails, DocumentInHistory, Html5CanvasScene, ComprehensionLevel, WhiteboardOperation } from '@/types';
import { Participant } from '@/components/Participant';
import { StudentPlaceholder } from '../StudentPlaceholder';
import { HandRaiseController } from '../HandRaiseController';
import { UnderstandingTracker } from '../UnderstandingTracker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ClassStudentList } from './ClassStudentList';
import { Loader2, UploadCloud, File, Trash2, Share2, Award, Users, Grid, Presentation, MessageSquare } from 'lucide-react';
import { Button } from '../ui/button';
import { getTeacherDocuments, shareDocument } from '@/lib/actions/session.actions';
import { SessionStatus } from './SessionStatus';
import { SessionTimer } from './SessionTimer';
import { DocumentHistory } from './DocumentHistory';
import { DocumentViewer } from './DocumentViewer';
import { cn } from '@/lib/utils';
import { ChatSheet } from '../ChatSheet';
import { Html5Whiteboard } from '@/components/Html5Whiteboard';
import { AnimatedCard } from './AnimatedCard';
import { useToast } from '@/hooks/use-toast';

interface TeacherSessionViewProps {
    sessionId: string;
    localStream: MediaStream | null;
    screenStream: MediaStream | null;
    remoteParticipants: { id: string; stream: MediaStream | undefined }[];
    spotlightedUser: SessionParticipant | undefined | null;
    allSessionUsers: SessionParticipant[];
    onlineUserIds: string[];
    onSpotlightParticipant: (participantId: string) => void;
    raisedHands: Set<string>;
    understandingStatus: Map<string, ComprehensionLevel>;
    currentUserId: string;
    onScreenShare: () => void;
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
    onDocumentShared: (doc: DocumentInHistory) => void;
}

export function TeacherSessionView({
    sessionId,
    localStream,
    screenStream,
    remoteParticipants,
    spotlightedUser,
    allSessionUsers,
    onlineUserIds: allOnlineUserIds,
    onSpotlightParticipant,
    raisedHands,
    understandingStatus,
    currentUserId,
    onScreenShare,
    isSharingScreen,
    activeTool,
    onToolChange,
    classroom,
    documentUrl,
    onSelectDocument,
    whiteboardControllerId,
    onWhiteboardControllerChange,
    initialDuration,
    timerTimeLeft,
    isTimerRunning,
    onStartTimer,
    onPauseTimer,
    onResetTimer,
    onWhiteboardEvent,
    whiteboardOperations,
    flushWhiteboardOperations,
    documentHistory,
    onDocumentShared,
}: TeacherSessionViewProps) {
    const { toast } = useToast();
    const [teacherView, setTeacherView] = useState<'content' | 'grid'>('content');
    
    const handleDocumentUploadSuccess = async (doc: { name: string; url: string }) => {
        try {
            const result = await shareDocument(sessionId, doc);
            if (result.success) {
                onDocumentShared(result.document);
                toast({ title: "Fichier partagé !", description: `"${doc.name}" est maintenant visible par les élèves.` });
            }
        } catch (error) {
            console.error("❌ [UPLOAD SUCCESS] - Erreur lors de l'appel de shareDocument:", error);
            toast({ variant: 'destructive', title: "Erreur de partage", description: "Le fichier a été téléversé mais n'a pas pu être partagé en temps réel." });
        }
    };
    
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
            return 600; // 10 minutes par défaut
        }
        return duration;
    }, [initialDuration]);

    const remoteStreamsMap = useMemo(() => 
        new Map(remoteParticipants.map(p => [p.id, p.stream])),
        [remoteParticipants]
    );
    
    const studentsWithRaisedHands = useMemo(() => 
        allSessionUsers.filter(u => u.role === 'ELEVE' && raisedHands.has(u.id)) as User[],
        [allSessionUsers, raisedHands]
    );
    
    const students = useMemo(() => 
        allSessionUsers.filter(u => u.role === 'ELEVE') as User[],
        [allSessionUsers]
    );

    const teacher = useMemo(() => 
        allSessionUsers.find(u => u.role === 'PROFESSEUR'),
        [allSessionUsers]
    );

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
            await shareDocument(sessionId, { name: doc.name, url: doc.url });
            toast({
                title: 'Document repartagé',
                description: `"${doc.name}" est de nouveau visible par tous.`,
            });
            onSelectDocument(doc);
        } catch (error) {
             toast({
                variant: 'destructive',
                title: 'Erreur de partage',
                description: "Impossible de repartager le document.",
            });
        }
    }, [sessionId, onSelectDocument, toast]);

    const handleWhiteboardEvent = useCallback((operations: WhiteboardOperation[]) => {
        onWhiteboardEvent(operations);
    }, [onWhiteboardEvent]);

    const handleFlushWhiteboardOperations = useCallback(() => {
        if (flushWhiteboardOperations) {
            flushWhiteboardOperations();
        }
    }, [flushWhiteboardOperations]);

    const renderParticipant = useCallback((participant: SessionParticipant) => {
        if (!participant) return null;
        
        const stream = participant.id === teacher?.id ? (isSharingScreen ? screenStream : localStream) : remoteStreamsMap.get(participant.id);
        const key = participant.id;

        if (stream) {
            return (
                <Participant
                    key={key}
                    stream={stream}
                    isLocal={participant.id === currentUserId}
                    isSpotlighted={participant.id === spotlightedUser?.id}
                    isTeacher={true}
                    participantUserId={participant.id}
                    onSpotlightParticipant={handleSpotlightAndSwitch}
                    displayName={participant.name ?? ''}
                    isHandRaised={raisedHands.has(participant.id)}
                    onSetWhiteboardController={onWhiteboardControllerChange}
                    isWhiteboardController={participant.id === whiteboardControllerId}
                />
            );
        }
        
        const studentData = allSessionUsers.find(u => u.id === participant.id) as User | undefined;
        if (!studentData) return null;

        return (
            <StudentPlaceholder
                key={key}
                student={studentData}
                isOnline={classOnlineIds.includes(participant.id)}
                onSpotlightParticipant={handleSpotlightAndSwitch}
                isHandRaised={raisedHands.has(participant.id)}
            />
        );
    }, [
        teacher?.id, 
        localStream, 
        remoteStreamsMap, 
        currentUserId, 
        spotlightedUser?.id, 
        handleSpotlightAndSwitch, 
        raisedHands, 
        onWhiteboardControllerChange, 
        whiteboardControllerId, 
        classOnlineIds,
        isSharingScreen,
        screenStream,
        allSessionUsers
    ]);
    
    const allGridParticipants = useMemo(() => {
        const participantMap = new Map<string, SessionParticipant>();

        // Add teacher
        if (teacher) {
            participantMap.set(teacher.id, teacher);
        }

        // Add all students from the classroom
        if (classroom?.eleves) {
            classroom.eleves.forEach(student => {
                if (!participantMap.has(student.id)) {
                    participantMap.set(student.id, student as SessionParticipant);
                }
            });
        }
        
        return Array.from(participantMap.values());
    }, [teacher, classroom?.eleves]);

    const renderActiveTool = useMemo(() => {
        if (isSharingScreen && screenStream) {
            return (
                <div className="w-full h-full bg-black rounded-lg overflow-hidden">
                    <Participant
                        stream={screenStream}
                        isLocal={true}
                        isTeacher={true}
                        participantUserId={currentUserId}
                        displayName="Votre partage d'écran"
                    />
                </div>
            );
        }
        
        const spotlightedStream = spotlightedUser?.id === currentUserId 
            ? (isSharingScreen ? screenStream : localStream)
            : remoteStreamsMap.get(spotlightedUser?.id ?? '');

        switch(activeTool) {
            case 'document':
                return (
                    <div className="h-full w-full rounded-lg overflow-hidden">
                        <DocumentViewer url={documentUrl} />
                    </div>
                );
                
            case 'whiteboard':
                return (
                    <div className="h-full w-full relative rounded-lg overflow-hidden">
                        <div className="absolute top-2 left-2 z-10 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                            👨‍🏫 Vous contrôlez le tableau
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
                return (
                    <Card className="h-full w-full flex flex-col items-center justify-center bg-muted/50 border-dashed rounded-lg">
                        <CardContent className="text-center text-muted-foreground p-6">
                            <Award className="h-10 w-10 mx-auto mb-4" />
                            <h3 className="font-semibold">Fonctionnalité Quiz</h3>
                            <p className="text-sm">Cet outil est en cours de développement.</p>
                        </CardContent>
                    </Card>
                );
                
            case 'chat':
                return (
                    <div className="h-full w-full rounded-lg overflow-hidden">
                        {classroom?.id && teacher?.id && teacher.role && (
                            <ChatSheet 
                                classroomId={classroom.id} 
                                userId={teacher.id} 
                                userRole={teacher.role} 
                            />
                        )}
                    </div>
                );
                
            case 'camera':
                if (!spotlightedUser) {
                    return (
                        <Card className="h-full w-full flex flex-col items-center justify-center bg-muted/30 border-dashed rounded-lg">
                            <CardContent className="text-center text-muted-foreground p-6">
                                <Users className="h-10 w-10 mx-auto mb-4" />
                                <h3 className="font-semibold text-xl">Aucun participant en vedette</h3>
                                <p className="text-sm mt-2">
                                    Sélectionnez un participant dans la liste pour le mettre en vedette.
                                </p>
                                <Button 
                                    variant="outline" 
                                    onClick={() => setTeacherView('grid')}
                                    className="mt-4"
                                >
                                    Voir tous les participants
                                </Button>
                            </CardContent>
                        </Card>
                    );
                }
                
                if (!spotlightedStream) {
                  return (
                    <Card className="h-full w-full flex flex-col items-center justify-center bg-muted/30 border-dashed rounded-lg">
                        <CardContent className="text-center text-muted-foreground p-6">
                            <Loader2 className="h-10 w-10 mx-auto mb-4 animate-spin" />
                            <h3 className="font-semibold text-xl">Connexion à {spotlightedUser.name}...</h3>
                        </CardContent>
                    </Card>
                  );
                }
                
                return (
                    <div className="w-full h-full bg-black rounded-lg overflow-hidden">
                        <Participant
                            stream={spotlightedStream}
                            isLocal={spotlightedUser.id === currentUserId}
                            isSpotlighted={true}
                            isTeacher={true}
                            participantUserId={spotlightedUser.id}
                            onSpotlightParticipant={onSpotlightParticipant}
                            displayName={spotlightedUser.name ?? ''}
                            isHandRaised={raisedHands.has(spotlightedUser.id)}
                            onSetWhiteboardController={onWhiteboardControllerChange}
                            isWhiteboardController={spotlightedUser.id === whiteboardControllerId}
                        />
                    </div>
                );
                
            default:
                return (
                    <Card className="h-full w-full flex flex-col items-center justify-center bg-muted/30 border-dashed rounded-lg">
                        <CardContent className="text-center text-muted-foreground p-6">
                            <File className="h-10 w-10 mx-auto mb-4" />
                            <h3 className="font-semibold text-xl">Outils d'enseignement</h3>
                            <p className="text-sm mt-2">
                                Utilisez le menu pour sélectionner un outil disponible.
                            </p>
                            <div className="flex gap-2 mt-4">
                                <Button variant="outline" onClick={() => onToolChange('document')}>
                                    Documents
                                </Button>
                                <Button variant="outline" onClick={() => onToolChange('camera')}>
                                    Caméra
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                );
        }
    }, [
        activeTool, 
        isSharingScreen,
        screenStream, 
        currentUserId, 
        documentUrl,
        onWhiteboardControllerChange, 
        whiteboardControllerId, 
        classroom?.id, 
        teacher?.id, 
        teacher?.role, 
        onToolChange, 
        spotlightedUser, 
        localStream, 
        remoteStreamsMap, 
        onSpotlightParticipant, 
        raisedHands, 
        sessionId,
        whiteboardOperations,
        handleWhiteboardEvent,
        handleFlushWhiteboardOperations,
    ]);
    
    if (!currentUserId || !teacher) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="animate-spin h-8 w-8 mx-auto" />
                    <p className="mt-2">Chargement de la session...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex min-h-0 gap-4 p-4">
            {/* Zone principale de contenu */}
            <div className="flex-1 flex flex-col min-h-0 min-w-0">
                {/* Sélecteur de vue */}
                <div className="flex items-center gap-2 mb-4">
                    <Button 
                        variant={teacherView === 'content' ? 'default' : 'outline'} 
                        size="sm" 
                        onClick={() => setTeacherView('content')}
                        className="flex-1"
                    >
                       <Presentation className="mr-2 h-4 w-4" /> Contenu
                    </Button>
                    <Button 
                        variant={teacherView === 'grid' ? 'default' : 'outline'} 
                        size="sm" 
                        onClick={() => setTeacherView('grid')}
                        className="flex-1"
                    >
                        <Grid className="mr-2 h-4 w-4" /> Grille
                    </Button>
                </div>

                {/* Contenu principal */}
                <div className="flex-1 min-h-0 rounded-lg border bg-card">
                    {teacherView === 'content' ? (
                        <div className="h-full w-full p-4">
                            {renderActiveTool}
                        </div>
                    ) : (
                        <ScrollArea className="h-full">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                                {allGridParticipants.map(p => renderParticipant(p))}
                            </div>
                        </ScrollArea>
                    )}
                </div>
            </div>

            {/* Panneau latéral */}
            <div className="w-100 flex-shrink-0 flex flex-col">
                <ScrollArea className="flex-1 -mr-3 pr-3">
                    <div className="space-y-4">
                        {/* Partage de Document */}
                        <AnimatedCard title="Partage de Document">
                            <div className='p-4 space-y-3'>
                                <DocumentUploadSection 
                                    sessionId={sessionId} 
                                    onUploadSuccess={(doc) => onDocumentShared(doc as any)} 
                                />
                                <DocumentHistory 
                                    documents={documentHistory} 
                                    onSelectDocument={onSelectDocument}
                                    onReshare={handleDocumentReshare}
                                    sessionId={sessionId}
                                />
                            </div>
                        </AnimatedCard>

                        {/* Gestion de Session */}
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
                        
                        {/* Liste des étudiants */}
                        {classroom && (
                            <AnimatedCard title={`Classe ${classroom.nom}`}>
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
                            </AnimatedCard>
                        )}
                        
                        {/* Suivi de la Compréhension */}
                        <AnimatedCard title="Suivi de la Compréhension">
                            <UnderstandingTracker students={students} understandingStatus={understandingStatus} />
                        </AnimatedCard>
                        
                        {/* Mains Levées */}
                        <AnimatedCard title="Mains Levées">
                            <HandRaiseController sessionId={sessionId} raisedHands={studentsWithRaisedHands} />
                        </AnimatedCard>
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
