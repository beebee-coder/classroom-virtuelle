// src/components/session/StudentSessionView.tsx
'use client';

import { Participant } from '@/components/Participant';
import { SessionParticipant, DocumentInHistory } from '@/lib/types';
import { Card } from '../ui/card';
import { Loader2 } from 'lucide-react';
import { StudentSessionControls, ComprehensionLevel } from '../StudentSessionControls';
import { updateStudentSessionStatus } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Whiteboard } from '../Whiteboard';
import { DocumentViewer } from '../DocumentViewer';
import { TLEditorSnapshot } from '@tldraw/tldraw';
import { broadcastWhiteboardUpdate } from '@/lib/actions';
import { ScrollArea } from '../ui/scroll-area';
import { SessionTimer } from './SessionTimer';

interface StudentSessionViewProps {
    sessionId: string;
    localStream: MediaStream | null;
    spotlightedStream: MediaStream | null;
    spotlightedUser: SessionParticipant | null | undefined;
    isHandRaised: boolean;
    onToggleHandRaise: (isRaised: boolean) => void;
    onUnderstandingChange: (status: ComprehensionLevel) => void;
    onLeaveSession: () => void;
    currentUnderstanding: ComprehensionLevel;
    currentUserId: string;
    activeTool: string;
    documentUrl: string | null;
    whiteboardSnapshot: TLEditorSnapshot | null;
    whiteboardControllerId: string | null;
    timerTimeLeft: number;
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
activeTool,
    documentUrl,
    whiteboardSnapshot,
    whiteboardControllerId,
    timerTimeLeft
}: StudentSessionViewProps) {
    const { toast } = useToast();

    const handleToggleHandRaise = async () => {
        const newHandRaiseState = !isHandRaised;
        onToggleHandRaise(newHandRaiseState); // Optimistic update
        try {
            await updateStudentSessionStatus(sessionId, { isHandRaised: newHandRaiseState });
        } catch {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de mettre à jour le statut de la main levée.'});
            onToggleHandRaise(!newHandRaiseState); // Revert on failure
        }
    };
    
    const handleUnderstandingUpdate = async (status: ComprehensionLevel) => {
        const newStatus = currentUnderstanding === status ? ComprehensionLevel.NONE : status;
        onUnderstandingChange(newStatus); // Optimistic update
        try {
            await updateStudentSessionStatus(sessionId, { understanding: newStatus });
        } catch {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de mettre à jour le statut de compréhension.'});
            onUnderstandingChange(currentUnderstanding); // Revert on failure
        }
    };

    const handleWhiteboardPersist = (snapshot: TLEditorSnapshot) => {
        // Seul l'élève contrôleur peut diffuser ses changements
        if (currentUserId === whiteboardControllerId) {
            broadcastWhiteboardUpdate(sessionId, snapshot);
        }
    }

    const renderMainContent = () => {
        switch(activeTool) {
            case 'document':
                return <DocumentViewer url={documentUrl} />;
            case 'camera':
                 if (!spotlightedUser || !spotlightedStream) {
                    return (
                        <Card className="aspect-video w-full h-full flex items-center justify-center bg-muted rounded-lg">
                            <div className="text-center text-muted-foreground">
                                <Loader2 className="animate-spin h-8 w-8 mx-auto" />
                                <p className="mt-2">En attente de la connexion...</p>
                            </div>
                        </Card>
                    );
                }
                return (
                    <div className="w-full h-full">
                        <Participant 
                            stream={spotlightedStream}
                            isLocal={false} 
                            isSpotlighted={true}
                            isTeacher={false}
                            participantUserId={spotlightedUser?.id ?? ''}
                            displayName={spotlightedUser?.name ?? undefined}
                        />
                    </div>
                );
            case 'whiteboard':
            default:
                 return (
                    <Whiteboard
                        sessionId={sessionId}
                        initialSnapshot={whiteboardSnapshot ?? undefined}
                        isController={currentUserId === whiteboardControllerId}
                        onPersist={handleWhiteboardPersist}
                    />
                );
        }
    };
    
    return (
        <div className="flex flex-row flex-1 min-h-0 py-6 gap-6">
            {/* Colonne principale : Contenu actif */}
            <div className="flex-1 flex flex-col min-w-0">
                <div className="w-full h-full relative">
                    {renderMainContent()}
                </div>
            </div>

            {/* Barre latérale droite : contrôles et vidéo locale */}
            <div className="w-72 flex flex-col gap-6">
                 <Participant
                    stream={localStream}
                    isLocal={true}
                    isTeacher={false}
                    participantUserId={currentUserId}
                    displayName="Vous"
                    isHandRaised={isHandRaised}
                    isWhiteboardController={currentUserId === whiteboardControllerId}
                />
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
                <ScrollArea className="flex-1">
                    <div className="pr-4">
                        <StudentSessionControls
                            isHandRaised={isHandRaised}
                            onRaiseHand={handleToggleHandRaise}
                            onComprehensionUpdate={handleUnderstandingUpdate}
                            currentComprehension={currentUnderstanding}
                        />
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
