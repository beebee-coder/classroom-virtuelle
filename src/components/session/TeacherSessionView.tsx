// src/components/session/TeacherSessionView.tsx
'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Role, SessionParticipant, ClassroomWithDetails } from '@/lib/types';
import { Participant } from '@/components/Participant';
import { StudentPlaceholder } from '../StudentPlaceholder';
import { HandRaiseController } from '../HandRaiseController';
import { UnderstandingTracker } from '../UnderstandingTracker';
import { Whiteboard } from '../Whiteboard';
import { Card, CardContent } from '../ui/card';
import { ParticipantList } from './ParticipantList';
import { ComprehensionLevel } from '../StudentSessionControls';
import { DocumentViewer } from '../DocumentViewer';
import { ClassStudentList } from './ClassStudentList';
import { Loader2, UploadCloud, File, Trash2, Share2 } from 'lucide-react';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";
import { CloudinaryUploadWidget } from '../CloudinaryUploadWidget';
import { Button } from '../ui/button';
import { shareDocument, broadcastWhiteboardUpdate, broadcastWhiteboardController } from '@/lib/actions';
import { TLEditorSnapshot } from '@tldraw/tldraw';
import { SessionStatus } from './SessionStatus';
import { SessionTimer } from './SessionTimer';


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
    isScreenSharing: boolean;
    activeTool: string;
    onToolChange: (tool: string) => void;
    classroom: ClassroomWithDetails | null;
    documentUrl: string | null;
    whiteboardControllerId: string | null; // Qui contrôle le TB
    onWhiteboardControllerChange: (userId: string) => void; // Pour changer le contrôleur
    initialDuration: number;
    timerTimeLeft: number;
    isTimerRunning: boolean;
    onStartTimer: () => void;
    onPauseTimer: () => void;
    onResetTimer: (newDuration?: number) => void;
}


export function TeacherSessionView({
    sessionId,
    localStream,
    screenStream,
    remoteParticipants,
    spotlightedUser,
    allSessionUsers,
    onlineUserIds,
    onSpotlightParticipant,
    raisedHands,
    understandingStatus,
    currentUserId,
    onScreenShare,
    isScreenSharing,
    activeTool,
    onToolChange,
    classroom,
    documentUrl,
    whiteboardControllerId,
    onWhiteboardControllerChange,
    initialDuration,
    timerTimeLeft,
    isTimerRunning,
    onStartTimer,
    onPauseTimer,
    onResetTimer,
}: TeacherSessionViewProps) {
    const remoteStreamsMap = new Map(remoteParticipants.map(p => [p.id, p.stream]));
    
    const studentsWithRaisedHands = allSessionUsers.filter(u => u.role === 'ELEVE' && raisedHands.has(u.id)) as User[];
    
    const students = classroom?.eleves || allSessionUsers.filter(u => u.role === 'ELEVE') as User[];
    
    const teacher = allSessionUsers.find(u => u.role === 'PROFESSEUR');
    
    if (!currentUserId || !teacher) return null;

    const activeParticipantIds = [currentUserId, ...remoteParticipants.map(p => p.id)];

    const handleDocumentUpload = (result: any) => {
        if (result.event === 'success') {
            const newDoc = {
                name: result.info.original_filename,
                url: result.info.secure_url,
            };
            // Temporarily, we'll just share it. A full implementation would update a history state.
            shareDocument(sessionId, newDoc);
        }
    };
    
    const handleDocumentShare = (doc: { name: string, url: string }) => {
        shareDocument(sessionId, doc);
    }

    const handleWhiteboardPersist = (snapshot: TLEditorSnapshot) => {
        broadcastWhiteboardUpdate(sessionId, snapshot);
    }

    const handleSetWhiteboardController = (userId: string) => {
        console.log(`🕹️ [PROF] - Clic pour donner le contrôle à ${userId}`);
        onWhiteboardControllerChange(userId);
    };

    const renderActiveTool = () => {
        if (screenStream) {
             return (
                <Card className="w-full h-full p-2 bg-black">
                    <Participant
                        stream={screenStream}
                        isLocal={true}
                        isTeacher={true}
                        participantUserId={currentUserId}
                        displayName="Votre partage d'écran"
                    />
                </Card>
            );
        }

        switch(activeTool) {
            case 'document':
                return (
                    <div className="h-full w-full flex flex-col gap-4">
                        <div className="flex-1 min-h-0">
                            <DocumentViewer url={documentUrl} />
                        </div>
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-semibold">Partager un document</h4>
                                    <CloudinaryUploadWidget onUpload={handleDocumentUpload}>
                                        {({ open }) => (
                                            <Button onClick={() => open()} variant="outline" size="sm">
                                                <UploadCloud className="mr-2" />
                                                Téléverser
                                            </Button>
                                        )}
                                    </CloudinaryUploadWidget>
                                </div>
                                {/* L'historique pourrait être implémenté ici */}
                            </CardContent>
                        </Card>
                    </div>
                );
            case 'camera':
                 const spotlightedStream = spotlightedUser?.id === currentUserId 
                    ? localStream
                    : remoteStreamsMap.get(spotlightedUser?.id ?? '');

                if (!spotlightedUser || !spotlightedStream) {
                    return (
                        <Card className="aspect-video w-full h-full flex items-center justify-center bg-muted rounded-lg">
                            <div className="text-center text-muted-foreground">
                                <Loader2 className="animate-spin h-8 w-8 mx-auto" />
                                <p className="mt-2">Recherche du participant en vedette...</p>
                            </div>
                        </Card>
                    );
                }
                return (
                    <Card className="w-full h-full p-2 bg-black">
                         <Participant
                            stream={spotlightedStream}
                            isLocal={spotlightedUser.id === currentUserId}
                            isSpotlighted={true}
                            isTeacher={true}
                            participantUserId={spotlightedUser.id}
                            onSpotlightParticipant={onSpotlightParticipant}
                            displayName={spotlightedUser.name ?? ''}
                            isHandRaised={raisedHands.has(spotlightedUser.id)}
                        />
                    </Card>
                );
            case 'whiteboard':
            default:
                return (
                    <Whiteboard 
                        sessionId={sessionId}
                        onPersist={handleWhiteboardPersist}
                        isController={currentUserId === whiteboardControllerId}
                    />
                );
        }
    };

    return (
        <div className="flex-1 flex min-h-0 py-6 gap-4">
            {/* --- Colonne Principale : Espace de travail & Vidéos --- */}
            <div className="flex-1 flex flex-col gap-4">
                {/* Espace de contenu : Tableau blanc ou Partage d'écran */}
                <div className="flex-1">
                   {renderActiveTool()}
                </div>

                {/* Bandeau de vidéos en carrousel */}
                <Carousel 
                    opts={{
                        align: "start",
                        dragFree: true,
                    }}
                    className="w-full"
                >
                    <CarouselContent className="-ml-4">
                        {/* Professeur */}
                        <CarouselItem className="basis-1/4 md:basis-1/5 lg:basis-1/6 pl-4">
                            <Participant 
                                key={teacher.id}
                                stream={localStream}
                                isLocal={true}
                                isSpotlighted={teacher.id === spotlightedUser?.id}
                                isTeacher={true}
                                participantUserId={teacher.id}
                                onSpotlightParticipant={onSpotlightParticipant}
                                displayName={teacher.name ?? ''}
                                isHandRaised={raisedHands.has(teacher.id)}
                                onSetWhiteboardController={handleSetWhiteboardController}
                                isWhiteboardController={teacher.id === whiteboardControllerId}
                            />
                        </CarouselItem>
                         {/* Élèves */}
                        {students.map(student => {
                            const stream = remoteStreamsMap.get(student.id);
                            return (
                                <CarouselItem key={student.id} className="basis-1/4 md:basis-1/5 lg:basis-1/6 pl-4">
                                {stream ? (
                                    <Participant
                                        stream={stream}
                                        isLocal={false}
                                        isSpotlighted={student.id === spotlightedUser?.id}
                                        isTeacher={true}
                                        participantUserId={student.id}
                                        onSpotlightParticipant={onSpotlightParticipant}
                                        displayName={student.name ?? ''}
                                        isHandRaised={raisedHands.has(student.id)}
                                        onSetWhiteboardController={handleSetWhiteboardController}
                                        isWhiteboardController={student.id === whiteboardControllerId}
                                    />
                                ) : (
                                    <StudentPlaceholder
                                        student={student as User}
                                        isOnline={onlineUserIds.includes(student.id)}
                                        onSpotlightParticipant={onSpotlightParticipant}
                                        isHandRaised={raisedHands.has(student.id)}
                                    />
                                )}
                                </CarouselItem>
                            )
                        })}
                    </CarouselContent>
                    <CarouselPrevious className="absolute left-0 top-1/2 -translate-y-1/2 z-10" />
                    <CarouselNext className="absolute right-0 top-1/2 -translate-y-1/2 z-10" />
                </Carousel>
            </div>

            {/* --- Colonne de Droite : Outils Interactifs --- */}
            <div className="w-72 flex flex-col gap-4 min-h-0">
                <ScrollArea className='h-full'>
                    <div className='space-y-4 pr-3'>
                        <SessionTimer
                            isTeacher={true}
                            sessionId={sessionId}
                            initialDuration={initialDuration}
                            timeLeft={timerTimeLeft}
                            isTimerRunning={isTimerRunning}
                            onStart={onStartTimer}
                            onPause={onPauseTimer}
                            onReset={onResetTimer}
                        />
                        <SessionStatus 
                            participants={allSessionUsers as User[]}
                            onlineIds={onlineUserIds}
                            webrtcConnections={remoteParticipants.length}
                            whiteboardControllerId={whiteboardControllerId}
                        />
                         {classroom && (
                            <ClassStudentList 
                                classroom={classroom}
                                onlineUserIds={onlineUserIds}
                                currentUserId={currentUserId}
                                activeParticipantIds={activeParticipantIds}
                                sessionId={sessionId}
                            />
                        )}
                        <UnderstandingTracker students={students} understandingStatus={understandingStatus} />
                        <HandRaiseController sessionId={sessionId} raisedHands={studentsWithRaisedHands} />
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
