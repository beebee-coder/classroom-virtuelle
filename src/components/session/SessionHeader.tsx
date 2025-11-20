// src/components/session/SessionHeader.tsx
'use client';

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, PhoneOff, Mic, MicOff, Video, VideoOff, ScreenShare, ScreenShareOff } from "lucide-react";
import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { NavIconButton } from "./NavIconButton";
import { CubeSpinner } from "./CubeSpinner";
import { AblyStatusIndicator } from '../ui/AblyStatusIndicator';
import { toolPresets } from '@/lib/constants'; // Import des préréglages
import type { Classroom } from '@prisma/client';
import { VideoControls } from '../VideoControls'; // Import du nouveau composant

interface SessionHeaderProps {
    sessionId: string;
    isTeacher: boolean;
    onEndSession: () => void;
    onLeaveSession: () => void;
    isEndingSession?: boolean;
    isSharingScreen: boolean;
    onToggleScreenShare: () => void;
    isMuted: boolean;
    onToggleMute: () => void;
    isVideoOff: boolean;
    onToggleVideo: () => void;
    activeTool: string;
    onToolChange: (tool: string) => void;
    classroom: Classroom | null; // Passer les infos de la classe
}

export function SessionHeader({ 
    sessionId, 
    isTeacher, 
    onEndSession,
    onLeaveSession,
    isEndingSession = false,
    isSharingScreen,
    onToggleScreenShare,
    isMuted,
    onToggleMute,
    isVideoOff,
    onToggleVideo,
    activeTool,
    onToolChange,
    classroom,
}: SessionHeaderProps) {
    
    const handleEndSessionClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onEndSession();
    }, [onEndSession]);

    const handleLeaveSessionClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("🚪 [SESSION HEADER] Clic sur 'Quitter la session'");
        onLeaveSession();
    }, [onLeaveSession]);

    // Déterminer le bon préréglage d'outils
    const subject = classroom?.subject || 'DEFAULT';
    const teacherTools = toolPresets[subject] || toolPresets.DEFAULT;
    
    return (
        <header className="border-b bg-background/95 backdrop-blur-sm z-10 sticky top-0">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
                <div className='flex items-center gap-4 w-48'>
                    <div className="hidden sm:block">
                        <CubeSpinner />
                    </div>
                    <AblyStatusIndicator /> 
                </div>

                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-4">
                    <ul className="nav-icon-list">
                        {isTeacher && teacherTools.map(tool => (
                            <NavIconButton
                                key={tool.id}
                                icon={tool.icon}
                                label={tool.name}
                                colors={tool.colors}
                                isActive={activeTool === tool.id}
                                onClick={() => onToolChange(tool.id)}
                            />
                        ))}
                    </ul>
                    {isTeacher && <div className="h-8 border-l mx-2"></div>}
                     <VideoControls 
                        isMuted={isMuted}
                        onToggleMute={onToggleMute}
                        isVideoOff={isVideoOff}
                        onToggleVideo={onToggleVideo}
                        isSharingScreen={isSharingScreen}
                        onToggleScreenShare={onToggleScreenShare}
                    />
                </div>
                
                <div className='w-48 flex justify-end'>
                    {isTeacher ? (
                        <Button 
                            variant="destructive" 
                            onClick={handleEndSessionClick} 
                            disabled={isEndingSession}
                            data-session-action="end-session"
                        >
                            {isEndingSession ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Fermeture...
                                </>
                            ) : (
                                <>
                                    <PhoneOff className="mr-2 h-4 w-4" />
                                    Terminer
                                </>
                            )}
                        </Button>
                    ) : (
                         <Button 
                            variant="destructive" 
                            onClick={handleLeaveSessionClick}
                            data-session-action="leave-session"
                         >
                            <PhoneOff className="mr-2 h-4 w-4" />
                            Quitter
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
}
