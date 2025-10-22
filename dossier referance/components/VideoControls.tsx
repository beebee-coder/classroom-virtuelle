// src/components/VideoControls.tsx
"use client";

import { Mic, MicOff, ScreenShare, ScreenShareOff, Video, VideoOff } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface VideoControlsProps {
  isSharingScreen: boolean;
  onToggleScreenShare: () => void;
  // TODO: Add props for mute/unmute, video on/off
}

export function VideoControls({ isSharingScreen, onToggleScreenShare }: VideoControlsProps) {
  // Placeholder states
  const isMuted = false;
  const isVideoOff = false;

  return (
    <div className="flex gap-2 p-1 rounded-lg bg-muted border">
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant={isMuted ? "destructive" : "outline"} size="icon" className="h-8 w-8">
                        {isMuted ? <MicOff /> : <Mic />}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{isMuted ? "Activer le micro" : "Couper le micro"}</p>
                </TooltipContent>
            </Tooltip>
             <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant={isVideoOff ? "destructive" : "outline"} size="icon" className="h-8 w-8">
                        {isVideoOff ? <VideoOff /> : <Video />}
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
                        className={isSharingScreen ? 'text-primary h-8 w-8' : 'h-8 w-8'}
                    >
                        {isSharingScreen ? <ScreenShareOff /> : <ScreenShare />}
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
