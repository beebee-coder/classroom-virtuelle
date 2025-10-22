// src/components/StudentPlaceholder.tsx
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { cn } from '@/lib/utils';
import { StudentWithCareer } from '@/lib/types';
import { Hand, VideoOff, Star } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Button } from './ui/button';

interface StudentPlaceholderProps {
  student: StudentWithCareer;
  isOnline: boolean;
  isHandRaised?: boolean;
  onSpotlightParticipant: (participantId: string) => void;
}

export function StudentPlaceholder({ 
  student, 
  isOnline, 
  isHandRaised,
  onSpotlightParticipant,
}: StudentPlaceholderProps) {
  const careerName = student.etat?.metier?.nom;

  return (
    <Card 
      className={cn(
        "relative aspect-video bg-muted rounded-lg overflow-hidden flex flex-col items-center justify-center p-2 group",
        !isOnline && "opacity-70",
        isHandRaised && "ring-2 ring-blue-500",
      )}
    >
        <div className={cn(
            "absolute top-2 right-2 flex items-center gap-1.5 text-xs px-2 py-1 rounded-full",
             isOnline ? "bg-green-500/20 text-green-700" : "bg-background/50"
        )}>
            {isOnline ? (
                <>
                    <div className="w-2 h-2 rounded-full bg-green-500"/>
                    <span>En ligne</span>
                </>
            ) : (
                <>
                    <VideoOff className="h-3 w-3" />
                    <span>Hors ligne</span>
                </>
            )}
        </div>
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
            {isHandRaised && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                           <div className="bg-blue-500/80 backdrop-blur-sm rounded-md p-1 animate-pulse">
                                <Hand className="h-3 w-3 text-white" />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                           <p>Main levée</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
        </div>
        
        <Avatar className="h-12 w-12 text-xl mb-2">
            <AvatarFallback>{student.name?.charAt(0)}</AvatarFallback>
        </Avatar>
        <p className="font-semibold text-sm text-center">{student.name}</p>
        {careerName && <p className="text-xs text-muted-foreground text-center">{careerName}</p>}

        {isOnline && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="secondary" size="icon" className="h-6 w-6 bg-black/50 hover:bg-black/80 border-none" onClick={() => onSpotlightParticipant(student.id)}>
                                <Star className="h-3 w-3" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Mettre en vedette (audio seulement)</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        )}
    </Card>
  );
}
