// src/components/session/StudentSessionView.tsx
'use client';

import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Participant } from '@/components/Participant';
import { SessionParticipant, DocumentInHistory } from '@/types';
import { Card } from '../ui/card';
import { Loader2 } from 'lucide-react';
import { StudentSessionControls, ComprehensionLevel } from '../StudentSessionControls';
import { updateStudentSessionStatus } from '@/lib/actions/session.actions';
import { useToast } from '@/hooks/use-toast';
import { Whiteboard } from '../Whiteboard';
import { TLEditorSnapshot } from '@tldraw/tldraw';
import { broadcastWhiteboardUpdate } from '@/lib/actions/whiteboard.actions';
import { ScrollArea } from '../ui/scroll-area';
import { SessionTimer } from './SessionTimer';
import { CardHeader } from '../ui/card';

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
            await updateStudentSessionStatus(sessionId, {
                isHandRaised: newHandRaiseState,
                understanding: ComprehensionLevel.UNDERSTOOD
            });
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
            case 'whiteboard':
                 return (
                    <Whiteboard
                        sessionId={sessionId}
                        initialSnapshot={whiteboardSnapshot ?? undefined}
                        isController={currentUserId === whiteboardControllerId}
                        onPersist={handleWhiteboardPersist}
                    />
                );
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

            {/* --- Colonne de Droite : Outils Interactifs --- */}
            <div className="w-68 flex-shrink-0 flex flex-col">
                <motion.div layout className="h-full flex flex-col gap-1 p-2">
                    <ScrollArea className="flex-1 pr-3 -mr-3">
                         <div className="space-y-4">
                            <AnimatedCard title="Ma Vidéo">
                                <div className="p-2">
                                    <Participant
                                        stream={localStream}
                                        isLocal={true}
                                        isTeacher={false}
                                        participantUserId={currentUserId}
                                        displayName="Vous"
                                        isHandRaised={isHandRaised}
                                        isWhiteboardController={currentUserId === whiteboardControllerId}
                                    />
                                </div>
                            </AnimatedCard>
                             <AnimatedCard title="Minuteur">
                                 <SessionTimer
                                    isTeacher={false}
                                    sessionId={sessionId}
                                    timeLeft={timerTimeLeft}
                                    isTimerRunning={false} // Les élèves ne contrôlent pas
                                    initialDuration={0}
                                    onStart={() => {}}
                                    onPause={() => {}}
                                    onReset={() => {}}
                                />
                             </AnimatedCard>
                             <AnimatedCard title="Mes Outils">
                                 <StudentSessionControls
                                    isHandRaised={isHandRaised}
                                    onRaiseHand={handleToggleHandRaise}
                                    onComprehensionUpdate={handleUnderstandingUpdate}
                                    currentComprehension={currentUnderstanding}
                                />
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
    const [isOpen, setIsOpen] = useState(true);
    const toggleOpen = () => setIsOpen(!isOpen);
  
    return (
      <motion.div layout initial={{ borderRadius: 10 }} className="bg-card/80 backdrop-blur-sm border border-border/50">
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