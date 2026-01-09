// src/components/StudentPlaceholder.tsx
'use client';

import { Card } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { cn } from '@/lib/utils';
import { User } from '@prisma/client';
import { Hand, VideoOff, Star } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Button } from './ui/button';

interface StudentPlaceholderProps {
  student: User;
  isOnline: boolean;
  isHandRaised?: boolean;
  onSpotlightParticipant: (participantId: string) => void;
  compact?: boolean;
}

export function StudentPlaceholder({ 
  student, 
  isOnline, 
  isHandRaised,
  onSpotlightParticipant,
  compact = false,
}: StudentPlaceholderProps) {
  const careerName = (student as any).etat?.metier?.nom;

  return (
    <Card 
      className={cn(
        "relative aspect-video bg-muted rounded-lg overflow-hidden flex flex-col items-center justify-center p-2 group",
        !isOnline && "opacity-70",
        isHandRaised && "ring-2 ring-blue-500",
      )}
    >
        {/* Indicateur de connexion */}
        <div className={cn(
            "absolute top-2 right-2 flex items-center gap-1.5 text-xs px-2 py-1 rounded-full",
            isOnline 
              ? "bg-green-500/20 text-green-700" 
              : "bg-background/50 text-muted-foreground"
        )}>
            {isOnline ? (
                <>
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span>En ligne</span>
                </>
            ) : (
                <>
                    <VideoOff className="h-3 w-3" aria-hidden="true" />
                    <span>Hors ligne</span>
                </>
            )}
        </div>

        {/* Main levée */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
            {isHandRaised && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div 
                                className={cn(
                                    "bg-blue-500/80 backdrop-blur-sm rounded-md p-1",
                                    // ✅ Respecte prefers-reduced-motion
                                    "[@media_(prefers-reduced-motion:_no-preference)]:animate-pulse"
                                )}
                                aria-label="Main levée"
                            >
                                <Hand className="h-3 w-3 text-white" aria-hidden="true" />
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
            <AvatarFallback className="bg-gray-200">
                {student.name?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
        </Avatar>
        <p className="font-semibold text-sm text-center truncate max-w-full px-1">
            {student.name}
        </p>
        {careerName && (
            <p className="text-xs text-muted-foreground text-center truncate max-w-full px-1">
                {careerName}
            </p>
        )}

        {/* Bouton "Mettre en vedette" */}
        {isOnline && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button 
                                variant="secondary" 
                                size="icon" 
                                className="h-6 w-6 bg-background/80 hover:bg-background/90 border-none shadow"
                                onClick={() => onSpotlightParticipant(student.id)}
                                aria-label="Mettre en vedette"
                            >
                                <Star className="h-3 w-3 text-foreground" aria-hidden="true" />
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