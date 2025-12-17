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
import { toolPresets } from '@/lib/constants';
import type { Classroom } from '@prisma/client';
import { VideoControls } from '../VideoControls';

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
    classroom: Classroom | null;
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
    
    const teacherTools = toolPresets.DEFAULT;
    
    return (
        <header className="border-b bg-background/95 backdrop-blur-sm z-10 sticky top-0">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
                {/* Gauche : indicateur de connexion */}
                <div className='flex items-center gap-4 w-48 min-w-0'>
                    <div className="hidden sm:block">
                        <CubeSpinner />
                    </div>
                    <AblyStatusIndicator /> 
                </div>

                {/* Centre : outils + contrôles média */}
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-4 min-w-0 overflow-hidden">
                    <ul className="nav-icon-list flex items-center gap-1">
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
                    
                    {isTeacher && teacherTools.length > 0 && (
                        <div className="h-8 border-l border-border mx-2" aria-hidden="true" />
                    )}
                    
                    <VideoControls 
                        isMuted={isMuted}
                        onToggleMute={onToggleMute}
                        isVideoOff={isVideoOff}
                        onToggleVideo={onToggleVideo}
                        isSharingScreen={isSharingScreen}
                        onToggleScreenShare={onToggleScreenShare}
                    />
                </div>
                
                {/* Droite : action de fin de session */}
                <div className='w-48 flex justify-end min-w-0'>
                    {isTeacher ? (
                        <Button 
                            variant="destructive" 
                            onClick={handleEndSessionClick} 
                            disabled={isEndingSession}
                            aria-label={isEndingSession ? "Fermeture en cours..." : "Terminer la session"}
                            data-session-action="end-session"
                        >
                            {isEndingSession ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                                    Fermeture...
                                </>
                            ) : (
                                <>
                                    <PhoneOff className="mr-2 h-4 w-4" aria-hidden="true" />
                                    Terminer
                                </>
                            )}
                        </Button>
                    ) : (
                        <Button 
                            variant="destructive" 
                            onClick={handleLeaveSessionClick}
                            aria-label="Quitter la session"
                            data-session-action="leave-session"
                        >
                            <PhoneOff className="mr-2 h-4 w-4" aria-hidden="true" />
                            Quitter
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
}
