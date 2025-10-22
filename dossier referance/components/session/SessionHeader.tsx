// src/components/session/SessionHeader.tsx
'use client';

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, PhoneOff } from "lucide-react";
import { SessionTimer } from "./SessionTimer";
import { useCallback } from "react";
import { VideoControls } from "../VideoControls";

interface SessionHeaderProps {
    sessionId: string;
    isTeacher: boolean;
    onEndSession: () => void;
    onLeaveSession: () => void;
    isEndingSession?: boolean;
    isSharingScreen: boolean;
    onToggleScreenShare: () => void;
    initialDuration: number;
}

export function SessionHeader({ 
    sessionId, 
    isTeacher, 
    onEndSession,
    onLeaveSession,
    isEndingSession = false,
    isSharingScreen,
    onToggleScreenShare,
    initialDuration,
}: SessionHeaderProps) {
    
    // CORRECTION : Gestionnaire de clic direct et sécurisé
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
    
    return (
        <header className="border-b bg-background/95 backdrop-blur-sm z-10 sticky top-0">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
                <div className='flex items-center gap-4 w-48'>
                    <h1 className="text-xl font-bold hidden sm:block">Session: <Badge variant="secondary">{sessionId.substring(0,8)}</Badge></h1>
                </div>

                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-4">
                    <SessionTimer
                        isTeacher={isTeacher}
                        sessionId={sessionId}
                        initialDuration={initialDuration}
                    />
                     {isTeacher && (
                        <VideoControls 
                            isSharingScreen={isSharingScreen} 
                            onToggleScreenShare={onToggleScreenShare} 
                        />
                    )}
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
                                    Terminer la session
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
                            Quitter la session
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
}
