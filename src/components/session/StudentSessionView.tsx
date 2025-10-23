// src/components/session/StudentSessionView.tsx
'use client';

import { Hand, Smile, Meh, Frown } from 'lucide-react';
import { Participant } from '@/components/Participant';
import { User, Role, SessionParticipant } from '@/lib/types';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Loader2 } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { StudentSessionControls } from '../StudentSessionControls';

type UnderstandingStatus = 'understood' | 'confused' | 'lost' | 'none';


interface StudentSessionViewProps {
    sessionId: string;
    localStream: MediaStream | null;
    spotlightedStream: MediaStream | null;
    spotlightedUser: SessionParticipant | null | undefined;
    isHandRaised: boolean;
    onToggleHandRaise: () => void;
    onUnderstandingChange: (status: UnderstandingStatus) => void;
    onLeaveSession: () => void;
    currentUnderstanding: UnderstandingStatus;
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
                {renderMainContent()}
            </div>
            
            {/* Barre latérale droite : contrôles */}
            <div className="w-72 flex flex-col gap-6 min-h-0">
                <StudentSessionControls
                    isHandRaised={isHandRaised}
                    onRaiseHand={onToggleHandRaise}
                    onComprehensionUpdate={onUnderstandingChange}
                    currentComprehension={currentUnderstanding}
                    onLeaveSession={onLeaveSession}
                />
            </div>
        </div>
    );
}
