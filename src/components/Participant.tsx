// src/components/Participant.tsx
'use client';

import React, { useEffect, useRef } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Mic, MicOff, Star, Video, VideoOff, Hand, Edit } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

interface ParticipantProps {
  stream?: MediaStream | null;
  isLocal: boolean;
  isSpotlighted?: boolean;
  isTeacher: boolean;
  displayName?: string;
  participantUserId: string;
  isHandRaised?: boolean;
  onSpotlightParticipant?: (participantId: string) => void;
  onSetWhiteboardController?: (participantId: string) => void; 
  isWhiteboardController?: boolean; 
}

function ParticipantComponent({ 
    stream, 
    isLocal, 
    isSpotlighted, 
    isTeacher, 
    displayName, 
    participantUserId,
    isHandRaised,
    onSpotlightParticipant,
    onSetWhiteboardController,
    isWhiteboardController,
}: ParticipantProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  const nameToDisplay = displayName || participantUserId;
  const isMuted = !stream || stream.getAudioTracks().length === 0 || !stream.getAudioTracks().some(t => t.enabled);
  const hasVideo = stream && stream.getVideoTracks().length > 0 && stream.getVideoTracks().some(t => t.enabled);


  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleSpotlight = () => {
    if (!isTeacher || !onSpotlightParticipant) return;
    onSpotlightParticipant(participantUserId);
    toast({
        title: "Participant en vedette",
        description: `${nameToDisplay} est maintenant en vedette.`
    });
  }
  
  const handleSetController = () => {
    if (!isTeacher || !onSetWhiteboardController) return;
    console.log(`👑 [PARTICIPANT] Clic pour changer le contrôleur du tableau blanc pour: ${participantUserId}`);
    onSetWhiteboardController(participantUserId);
    toast({
      title: 'Contrôle du tableau blanc assigné',
      description: `${nameToDisplay} peut maintenant dessiner.`,
    });
  };

  // Le professeur peut voir le bouton si c'est la vidéo de qqn d'autre,
  // ou si c'est sa propre vidéo et que qqn d'autre a le contrôle (pour le reprendre).
  const canShowWhiteboardControlButton = isTeacher && onSetWhiteboardController && (!isLocal || !isWhiteboardController);

  return (
    <Card className={cn(
        "relative aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center group text-white",
        isSpotlighted && "ring-2 ring-amber-500 shadow-lg",
        isHandRaised && "ring-2 ring-blue-500",
        isWhiteboardController && "ring-4 ring-green-500 shadow-lg border-green-500", // Style plus visible
    )}>
        <video ref={videoRef} autoPlay playsInline muted={isLocal} className={cn("w-full h-full object-cover", !hasVideo && "hidden")} />

        {!hasVideo && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-800">
                <Avatar className="h-12 w-12 text-xl">
                    <AvatarFallback>{nameToDisplay?.charAt(0)}</AvatarFallback>
                </Avatar>
                <p className="text-sm font-semibold">{nameToDisplay}</p>
            </div>
        )}
       
        <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
             <TooltipProvider>
                 {canShowWhiteboardControlButton && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="secondary" size="icon" className="h-6 w-6 bg-black/50 hover:bg-black/80 border-none" onClick={handleSetController}>
                        <Edit className={cn("h-3 w-3", isWhiteboardController && "fill-green-500 text-green-500")} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{isWhiteboardController ? 'Retirer le contrôle' : 'Donner le contrôle du tableau'}</p></TooltipContent>
                  </Tooltip>
                 )}
                 {isTeacher && onSpotlightParticipant && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                             <Button variant="secondary" size="icon" className="h-6 w-6 bg-black/50 hover:bg-black/80 border-none" onClick={handleSpotlight}>
                                <Star className={cn("h-3 w-3", isSpotlighted && "fill-amber-500 text-amber-500")} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                           <p>Mettre en vedette</p>
                        </TooltipContent>
                    </Tooltip>
                )}
             </TooltipProvider>
        </div>
         <p className="absolute bottom-2 left-2 text-xs font-semibold bg-black/50 px-2 py-1 rounded">
            {isLocal ? 'Vous' : nameToDisplay}
        </p>
         <div className="absolute top-2 left-2 flex items-center gap-1.5">
            <div className="bg-black/50 backdrop-blur-sm rounded-md p-1">
                {isMuted ? <MicOff className="h-3 w-3 text-destructive" /> : <Mic className="h-3 w-3 text-green-500" />}
            </div>
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
             {isWhiteboardController && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="bg-green-500/80 backdrop-blur-sm rounded-md p-1">
                      <Edit className="h-3 w-3 text-white" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent><p>Contrôle du tableau blanc</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
        </div>
    </Card>
  );
}

export const Participant = React.memo(ParticipantComponent);
