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
  compact?: boolean;
  className?: string; // ✅ CORRECTION : Ajout de className pour le styling personnalisé
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
    compact = false,
    className = "", // ✅ CORRECTION : className avec valeur par défaut
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
        "relative bg-muted rounded-lg overflow-hidden flex items-center justify-center group text-white",
        // ✅ CORRECTION : Classes conditionnelles pour le mode plein écran
        compact ? "aspect-video min-h-[120px] max-h-[200px]" : "w-full h-full min-h-[300px]",
        isSpotlighted && "ring-2 ring-amber-500 shadow-lg",
        isHandRaised && "ring-2 ring-blue-500",
        isWhiteboardController && "ring-4 ring-green-500 shadow-lg border-green-500",
        className // ✅ CORRECTION : Application de la className personnalisée
    )}>
        {/* ✅ CORRECTION : Vidéo en plein écran */}
        <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted={isLocal} 
            className={cn(
                "w-full h-full object-cover", 
                !hasVideo && "hidden"
            )} 
        />

        {!hasVideo && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-800">
                <Avatar className={cn(
                    "text-xl", 
                    compact ? "h-8 w-8" : "h-20 w-20 text-3xl" // ✅ CORRECTION : Taille adaptative pour plein écran
                )}>
                    <AvatarFallback>{nameToDisplay?.charAt(0)}</AvatarFallback>
                </Avatar>
                <p className={cn(
                    "font-semibold", 
                    compact ? "text-xs" : "text-xl" // ✅ CORRECTION : Texte plus grand en plein écran
                )}>{nameToDisplay}</p>
            </div>
        )}
       
        {/* ✅ CORRECTION : Boutons plus grands en mode plein écran */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
             <TooltipProvider>
                 {canShowWhiteboardControlButton && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="secondary" size="icon" onClick={handleSetController} className={cn(
                          "bg-black/50 hover:bg-black/80 border-none", 
                          compact ? "h-5 w-5" : "h-10 w-10" // ✅ CORRECTION : Boutons plus grands
                      )}>
                        <Edit className={cn(
                            isWhiteboardController && "fill-green-500 text-green-500", 
                            compact ? "h-2.5 w-2.5" : "h-5 w-5" // ✅ CORRECTION : Icônes plus grandes
                        )} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{isWhiteboardController ? 'Retirer le contrôle' : 'Donner le contrôle du tableau'}</p></TooltipContent>
                  </Tooltip>
                 )}
                 {isTeacher && onSpotlightParticipant && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                             <Button variant="secondary" size="icon" onClick={handleSpotlight} className={cn(
                                 "bg-black/50 hover:bg-black/80 border-none", 
                                 compact ? "h-5 w-5" : "h-10 w-10" // ✅ CORRECTION : Boutons plus grands
                             )}>
                                <Star className={cn(
                                    isSpotlighted && "fill-amber-500 text-amber-500", 
                                    compact ? "h-2.5 w-2.5" : "h-5 w-5" // ✅ CORRECTION : Icônes plus grandes
                                )} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                           <p>Mettre en vedette</p>
                        </TooltipContent>
                    </Tooltip>
                )}
             </TooltipProvider>
        </div>
        
        {/* ✅ CORRECTION : Nom plus visible en plein écran */}
        <p className={cn(
            "absolute bottom-4 left-4 font-semibold bg-black/50 px-3 py-2 rounded", 
            compact ? "text-xs" : "text-lg" // ✅ CORRECTION : Texte plus grand
        )}>
            {isLocal ? 'Vous' : nameToDisplay}
        </p>
        
        {/* ✅ CORRECTION : Indicateurs plus visibles en plein écran */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
            <div className="bg-black/50 backdrop-blur-sm rounded-md p-2">
                {isMuted ? (
                    <MicOff className={cn("text-destructive", compact ? "h-2.5 w-2.5" : "h-5 w-5")} />
                ) : (
                    <Mic className={cn("text-green-500", compact ? "h-2.5 w-2.5" : "h-5 w-5")} />
                )}
            </div>
            {isHandRaised && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                           <div className="bg-blue-500/80 backdrop-blur-sm rounded-md p-2 animate-pulse">
                                <Hand className={cn("text-white", compact ? "h-2.5 w-2.5" : "h-5 w-5")} />
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
                    <div className="bg-green-500/80 backdrop-blur-sm rounded-md p-2">
                      <Edit className={cn("text-white", compact ? "h-2.5 w-2.5" : "h-5 w-5")} />
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
