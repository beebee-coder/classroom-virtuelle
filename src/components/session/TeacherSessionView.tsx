// src/components/session/TeacherSessionView.tsx
'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Role, SessionParticipant, ClassroomWithDetails, DocumentInHistory } from '@/lib/types';
import { Participant } from '@/components/Participant';
import { StudentPlaceholder } from '../StudentPlaceholder';
import { HandRaiseController } from '../HandRaiseController';
import { UnderstandingTracker } from '../UnderstandingTracker';
import { Whiteboard } from '../Whiteboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ParticipantList } from './ParticipantList';
import { ComprehensionLevel } from '../StudentSessionControls';
import { DocumentViewer } from '../DocumentViewer';
import { ClassStudentList } from './ClassStudentList';
import { Loader2, UploadCloud, File, Trash2, Share2, Award } from 'lucide-react';
import { CloudinaryUploadWidget } from '../CloudinaryUploadWidget';
import { Button } from '../ui/button';
import { shareDocument, broadcastWhiteboardUpdate, broadcastWhiteboardController } from '@/lib/actions';
import { TLEditorSnapshot } from '@tldraw/tldraw';
import { SessionStatus } from './SessionStatus';
import { SessionTimer } from './SessionTimer';
import { DocumentHistory } from './DocumentHistory';


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
    documentHistory: DocumentInHistory[];
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
    documentHistory,
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
            shareDocument(sessionId, newDoc);
        }
    };
    
    const handleDocumentShare = (doc: DocumentInHistory) => {
        shareDocument(sessionId, { name: doc.name, url: doc.url });
    }

    const handleWhiteboardPersist = (snapshot: TLEditorSnapshot) => {
        broadcastWhiteboardUpdate(sessionId, snapshot);
    }

    const handleSetWhiteboardController = (userId: string) => {
        console.log(`🕹️ [PROF] - Clic pour donner le contrôle à ${userId}`);
        onWhiteboardControllerChange(userId);
    };

    const renderParticipant = (participant: SessionParticipant, isDuplicate = false) => {
        const stream = participant.id === teacher.id ? localStream : remoteStreamsMap.get(participant.id);
        const key = `${participant.id}-${isDuplicate ? 'duplicate' : 'original'}`;

        if (stream) {
            return (
                <Participant
                    key={key}
                    stream={stream}
                    isLocal={participant.id === currentUserId}
                    isSpotlighted={participant.id === spotlightedUser?.id}
                    isTeacher={true}
                    participantUserId={participant.id}
                    onSpotlightParticipant={onSpotlightParticipant}
                    displayName={participant.name ?? ''}
                    isHandRaised={raisedHands.has(participant.id)}
                    onSetWhiteboardController={handleSetWhiteboardController}
                    isWhiteboardController={participant.id === whiteboardControllerId}
                />
            );
        }
        return (
             <StudentPlaceholder
                key={key}
                student={participant as User}
                isOnline={onlineUserIds.includes(participant.id)}
                onSpotlightParticipant={onSpotlightParticipant}
                isHandRaised={raisedHands.has(participant.id)}
            />
        );
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
                    </div>
                );
            case 'quiz':
                 return (
                    <Card className="h-full w-full flex flex-col items-center justify-center bg-muted/50 border-dashed">
                        <CardContent className="text-center text-muted-foreground p-6">
                            <Award className="h-10 w-10 mx-auto mb-4" />
                            <h3 className="font-semibold">Fonctionnalité Quiz</h3>
                            <p className="text-sm">Cet outil est en cours de développement.</p>
                        </CardContent>
                    </Card>
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

    const allParticipants = [teacher, ...students];

    return (
        <div className="flex-1 flex flex-col min-h-0">
            {/* Main content area */}
            <div className="flex-1 flex min-h-0 gap-4">
                {/* --- Colonne Principale : Espace de travail --- */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex-1 min-h-0 relative">
                        {renderActiveTool()}
                    </div>
                </div>

                {/* --- Colonne de Droite : Outils Interactifs --- */}
                <div className="w-72 flex flex-col gap-4 min-h-0">
                    <ScrollArea className='h-full'>
                        <div className='space-y-4 pr-3'>
                            {activeTool === 'document' && (
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
                                    </CardContent>
                                </Card>
                            )}
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
                            <DocumentHistory documents={documentHistory} onShare={handleDocumentShare} />
                            <UnderstandingTracker students={students} understandingStatus={understandingStatus} />
                            <HandRaiseController sessionId={sessionId} raisedHands={studentsWithRaisedHands} />
                        </div>
                    </ScrollArea>
                </div>
            </div>

            {/* Bandeau de vidéos en défilement continu en bas */}
            <div className="h-40 w-full overflow-hidden relative mt-4">
                <div className="marquee-container flex space-x-4 px-2 hover:[animation-play-state:paused]">
                    {allParticipants.map(p => (
                        <div key={p.id} className="w-48 flex-shrink-0">
                            {renderParticipant(p)}
                        </div>
                    ))}
                    {allParticipants.map(p => (
                        <div key={`${p.id}-duplicate`} className="w-48 flex-shrink-0" aria-hidden="true">
                            {renderParticipant(p, true)}
                        </div>
                    ))}
                </div>
                <div className="absolute inset-y-0 bg-gradient-to-r from-background via-transparent to-background pointer-events-none w-full" />
            </div>
        </div>
    );
}
