// src/components/session/StudentSessionView.tsx
'use client';

import { Participant } from '@/components/Participant';
import { SessionParticipant } from '@/lib/types';
import { Card } from '../ui/card';
import { Loader2 } from 'lucide-react';
import { StudentSessionControls, ComprehensionLevel } from '../StudentSessionControls';
import { updateStudentSessionStatus } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';

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

    const renderMainContent = () => {
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
    };
    
    return (
        <div className="flex flex-1 min-h-0 py-6 gap-6">
            {/* Colonne principale : Vidéo en vedette */}
            <div className="flex-1 flex flex-col min-h-0">
                <div className="w-full h-full relative">
                    {renderMainContent()}
                     <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
                        <div className="p-2 bg-background/80 backdrop-blur-sm rounded-lg border">
                           <Participant
                                stream={localStream}
                                isLocal={true}
                                isTeacher={false}
                                participantUserId={currentUserId}
                                displayName="Vous"
                            />
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Barre latérale droite : contrôles */}
            <div className="w-72 flex flex-col gap-6 min-h-0">
                <StudentSessionControls
                    isHandRaised={isHandRaised}
                    onRaiseHand={handleToggleHandRaise}
                    onComprehensionUpdate={handleUnderstandingUpdate}
                    currentComprehension={currentUnderstanding}
                />
            </div>
        </div>
    );
}
