// src/components/session/TeacherSessionView.tsx
'use client';

import { useState, type ReactNode, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Role } from '@prisma/client';
import type { SessionParticipant, ClassroomWithDetails, DocumentInHistory } from '@/types';
import { Participant } from '@/components/Participant';
import { StudentPlaceholder } from '../StudentPlaceholder';
import { HandRaiseController } from '../HandRaiseController';
import { UnderstandingTracker } from '../UnderstandingTracker';
import { Whiteboard } from '../Whiteboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ParticipantList } from './ParticipantList';
import { ComprehensionLevel } from '@/lib/types';
import { ClassStudentList } from './ClassStudentList';
import { Loader2, UploadCloud, File, Trash2, Share2, Award } from 'lucide-react';
import { CloudinaryUploadWidget } from '../CloudinaryUploadWidget';
import { Button } from '../ui/button';
import { shareDocument } from '@/lib/actions/session.actions';
import { TLEditorSnapshot } from '@tldraw/tldraw';
import { broadcastWhiteboardUpdate } from '@/lib/actions/whiteboard.actions';
import { SessionStatus } from './SessionStatus';
import { SessionTimer } from './SessionTimer';
import { DocumentHistory } from './DocumentHistory';
import { DocumentViewer } from './DocumentViewer';


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
    onlineUserIds: allOnlineUserIds, // Renommé pour plus de clarté
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
    console.log('🖼️ [PROF VIEW] Document URL:', documentUrl);
    const remoteStreamsMap = new Map(remoteParticipants.map(p => [p.id, p.stream]));
    
    const studentsWithRaisedHands = allSessionUsers.filter(u => u.role === 'ELEVE' && raisedHands.has(u.id)) as User[];
    
    const students = classroom?.eleves || allSessionUsers.filter(u => u.role === 'ELEVE') as User[];
    
    const teacher = allSessionUsers.find(u => u.role === 'PROFESSEUR');

    const activeParticipantIds = useMemo(() => {
        const ids = new Set<string>([currentUserId]);
        remoteParticipants.forEach(p => ids.add(p.id));
        return Array.from(ids);
    }, [currentUserId, remoteParticipants]);
    
    // Correction: les "onlineUserIds" pour la ClassList doivent être ceux de toute la classe, pas seulement les participants
    const classOnlineIds = allOnlineUserIds;

    const [hasWaitingStudents, setHasWaitingStudents] = useState(false);

    useEffect(() => {
        // Un élève est en attente s'il est en ligne mais pas dans la session active
        const waitingCount = classOnlineIds.filter(id => !activeParticipantIds.includes(id) && id !== currentUserId).length;
        if (waitingCount > 0) {
            console.log(`⏱️ [VUE PROF] - Détection de ${waitingCount} élève(s) en attente.`);
        }
        setHasWaitingStudents(waitingCount > 0);
    }, [classOnlineIds, activeParticipantIds, currentUserId]);
    
    if (!currentUserId || !teacher) return null;

    const handleDocumentUpload = async (result: any) => {
        if (result.event === 'success' && result.info) {
             const newDoc = {
                name: result.info.original_filename || 'Nouveau document',
                url: result.info.secure_url,
            };
            await shareDocument(sessionId, newDoc);
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
                isOnline={classOnlineIds.includes(participant.id)}
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
                return <DocumentViewer url={documentUrl} />;
            case 'whiteboard':
                return (
                    <Whiteboard 
                        sessionId={sessionId}
                        onPersist={handleWhiteboardPersist}
                        isController={currentUserId === whiteboardControllerId}
                    />
                );
            case 'quiz':
                 return (
                    <Card className="h-full w-full flex flex-col items-center justify-center bg-muted/50 border-dashed ">
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
        <div className="flex-1 flex min-h-0 min-w-0">
            {/* Main content area */}
            <div className="flex-1 flex flex-col min-h-0 min-w-0">
                 <div className="flex-1 min-h-0 relative">
                    {renderActiveTool()}
                </div>
                 {/* Video marquee at the bottom */}
                <div className="w-full overflow-hidden relative mt-6">
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

            {/* --- Colonne de Droite : Outils Interactifs --- */}
            <div className="w-68 flex-shrink-0 flex flex-col border-r p-3">
                <motion.div layout className="h-full flex flex-col gap-1  p-2">
                    <ScrollArea className="flex-1 pr-3 -mr-3">
                        <div className="space-y-4 ">
                            {activeTool === 'document' && (
                                <AnimatedCard title="Partager un document ">
                                    <div className="flex justify-between items-center ">
                                        <h4 className="font-semibold">Téléverser</h4>
                                        <CloudinaryUploadWidget onUpload={handleDocumentUpload}>
                                            {({ open }) => (
                                                <Button onClick={() => open()} variant="outline" size="sm">
                                                    <UploadCloud className="mr-2" />
                                                    Choisir
                                                </Button>
                                            )}
                                        </CloudinaryUploadWidget>
                                    </div>
                                </AnimatedCard>
                            )}
                            <AnimatedCard title="Minuteur">
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
                            </AnimatedCard>
                            <AnimatedCard title="Statut de la Session">
                                <SessionStatus 
                                    participants={allSessionUsers as User[]}
                                    onlineIds={activeParticipantIds}
                                    webrtcConnections={remoteParticipants.length}
                                    whiteboardControllerId={whiteboardControllerId}
                                />
                            </AnimatedCard>
                             {classroom && (
                                 <AnimatedCard title={`Classe ${classroom.nom}`}>
                                    <ClassStudentList 
                                        classroom={classroom}
                                        onlineUserIds={classOnlineIds}
                                        currentUserId={currentUserId}
                                        activeParticipantIds={activeParticipantIds}
                                        sessionId={sessionId}
                                        hasWaitingStudents={hasWaitingStudents}
                                        onAccordionToggle={(isOpen) => {
                                            if(isOpen) setHasWaitingStudents(false);
                                        }}
                                    />
                                </AnimatedCard>
                            )}
                            <AnimatedCard title="Historique des Documents">
                                <DocumentHistory documents={documentHistory} onShare={handleDocumentShare} />
                            </AnimatedCard>
                            <AnimatedCard title="Suivi de la Compréhension">
                                <UnderstandingTracker students={students} understandingStatus={understandingStatus} />
                            </AnimatedCard>
                            <AnimatedCard title="Mains Levées">
                                <HandRaiseController sessionId={sessionId} raisedHands={studentsWithRaisedHands} />
                            </AnimatedCard>
                        </div>
                    </ScrollArea>
                </motion.div>
            </div>
        </div>
    );
}


// --- Composants pour le style de la barre latérale animée ---

interface AnimatedCardProps {
    children: ReactNode;
    title: string;
}

const AnimatedCard = ({ children, title }: AnimatedCardProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const toggleOpen = () => setIsOpen(!isOpen);
  
    return (
      <motion.div layout initial={{ borderRadius: 10 }} className="bg-card/80 backdrop-blur-sm border border-border/50 bg-gray-400">
        <CardHeaderComponent toggleOpen={toggleOpen} title={title} />
        <AnimatePresence>{isOpen && <CardContentComponent>{children}</CardContentComponent>}</AnimatePresence>
      </motion.div>
    );
};

const CardHeaderComponent = ({ toggleOpen, title }: { toggleOpen: () => void, title: string }) => {
    return (
      <motion.div
        onClick={toggleOpen}
        layout
        initial={{ borderRadius: 10 }}
        className="flex items-center p-3 gap-3 cursor-pointer"
      >
        <motion.div
          layout
          className="rounded-full bg-primary/20 h-6 w-6"
        ></motion.div>
        <motion.div
          layout
          className="h-6 w-1 rounded-lg bg-primary/20"
        ></motion.div>
        <motion.p
          layout
          className="flex-grow text-sm font-semibold text-foreground"
        >
          {title}
        </motion.p>
      </motion.div>
    );
};
  
function CardContentComponent({ children }: { children: ReactNode }) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="w-full p-3 pt-0"
      >
        {children}
      </motion.div>
    );
}
