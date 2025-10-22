// src/components/session/StudentSessionView.tsx
'use client';

import { Hand, Smile, Meh, Frown } from 'lucide-react';
import { Participant } from '@/components/Participant';
import { StudentWithCareer } from '@/lib/types';
import { Role } from '@prisma/client';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { UnderstandingStatus } from '@/app/session/[id]/page';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

type SessionParticipant = (StudentWithCareer | (any & { role: Role })) & { role: Role };

interface StudentSessionViewProps {
    sessionId: string;
    localStream: MediaStream | null;
    spotlightedStream: MediaStream | null;
    spotlightedUser: SessionParticipant | null | undefined;
    isHandRaised: boolean;
    onToggleHandRaise: () => void;
    onUnderstandingChange: (status: UnderstandingStatus) => void;
    currentUnderstanding: UnderstandingStatus;
}

export function StudentSessionView({
    sessionId,
    localStream,
    spotlightedStream,
    spotlightedUser,
    isHandRaised,
    onToggleHandRaise,
    onUnderstandingChange,
    currentUnderstanding,
}: StudentSessionViewProps) {
    const { data: session } = useSession();
    const localUserId = session?.user.id;

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
            <div className="w-1/5 flex flex-col gap-6 min-h-0">
                 <Card>
                    <CardHeader className="p-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                           Niveau de compréhension
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                        <TooltipProvider>
                            <ToggleGroup type="single" value={currentUnderstanding} onValueChange={(value: string) => onUnderstandingChange(value as UnderstandingStatus || 'none')} className="w-full justify-between">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <ToggleGroupItem value="understood" aria-label="J'ai compris" className='data-[state=on]:bg-green-500/20 data-[state=on]:text-green-600'>
                                            <Smile className="h-5 w-5" />
                                        </ToggleGroupItem>
                                    </TooltipTrigger>
                                    <TooltipContent><p>J'ai compris</p></TooltipContent>
                                </Tooltip>
                                 <Tooltip>
                                    <TooltipTrigger asChild>
                                        <ToggleGroupItem value="confused" aria-label="Je suis un peu perdu" className='data-[state=on]:bg-yellow-500/20 data-[state=on]:text-yellow-600'>
                                            <Meh className="h-5 w-5" />
                                        </ToggleGroupItem>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Je suis un peu perdu</p></TooltipContent>
                                </Tooltip>
                                 <Tooltip>
                                    <TooltipTrigger asChild>
                                        <ToggleGroupItem value="lost" aria-label="Je n'ai pas compris" className='data-[state=on]:bg-red-500/20 data-[state=on]:text-red-600'>
                                            <Frown className="h-5 w-5" />
                                        </ToggleGroupItem>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Je n'ai pas compris</p></TooltipContent>
                                </Tooltip>
                            </ToggleGroup>
                        </TooltipProvider>
                    </CardContent>
                </Card>
                <Button 
                    onClick={onToggleHandRaise} 
                    className={cn("w-full", isHandRaised && "bg-blue-600 hover:bg-blue-700 animate-pulse")}
                >
                   <Hand className="mr-2 h-5 w-5" />
                   {isHandRaised ? 'Baisser la main' : 'Lever la main'}
                </Button>
            </div>
        </div>
    );
}