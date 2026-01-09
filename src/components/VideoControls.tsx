// src/components/VideoControls.tsx
"use client";

import { Mic, MicOff, ScreenShare, ScreenShareOff, Video, VideoOff } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface VideoControlsProps {
  isSharingScreen: boolean;
  onToggleScreenShare: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isVideoOff: boolean;
  onToggleVideo: () => void;
}

export function VideoControls({ 
    isSharingScreen, 
    onToggleScreenShare,
    isMuted,
    onToggleMute,
    isVideoOff,
    onToggleVideo
}: VideoControlsProps) {

  return (
    <div className="flex gap-2 p-1 rounded-lg">
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant={isMuted ? "destructive" : "outline"}
                        size="icon"
                        className="h-8 w-8"
                        onClick={onToggleMute}
                        aria-label={isMuted ? "Activer le micro" : "Couper le micro"}
                    >
                        {isMuted ? <MicOff aria-hidden="true" /> : <Mic aria-hidden="true" />}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{isMuted ? "Activer le micro" : "Couper le micro"}</p>
                </TooltipContent>
            </Tooltip>
            
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant={isVideoOff ? "destructive" : "outline"}
                        size="icon"
                        className="h-8 w-8"
                        onClick={onToggleVideo}
                        aria-label={isVideoOff ? "Activer la caméra" : "Désactiver la caméra"}
                    >
                        {isVideoOff ? <VideoOff aria-hidden="true" /> : <Video aria-hidden="true" />}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{isVideoOff ? "Activer la caméra" : "Désactiver la caméra"}</p>
                </TooltipContent>
            </Tooltip>
            
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={onToggleScreenShare}
                        className={`
                            h-8 w-8 transition-colors
                            ${isSharingScreen 
                                ? 'bg-primary/10 text-primary border-primary' 
                                : ''}
                        `}
                        aria-label={isSharingScreen ? "Arrêter le partage d’écran" : "Partager l’écran"}
                    >
                        {isSharingScreen ? 
                            <ScreenShareOff aria-hidden="true" /> : 
                            <ScreenShare aria-hidden="true" />
                        }
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{isSharingScreen ? "Arrêter le partage" : "Partager l'écran"}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    </div>
  );
}