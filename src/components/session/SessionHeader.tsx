// src/components/session/SessionHeader.tsx
'use client';

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, PhoneOff, Square, FileText, Award, Camera } from "lucide-react";
import { useCallback } from "react";
import { VideoControls } from "../VideoControls";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { cn } from "@/lib/utils";

interface SessionHeaderProps {
    sessionId: string;
    isTeacher: boolean;
    onEndSession: () => void;
    onLeaveSession: () => void;
    isEndingSession?: boolean;
    isSharingScreen: boolean;
    onToggleScreenShare: () => void;
    activeTool: string;
    onToolChange: (tool: string) => void;
    timerTimeLeft: number;
    isTimerRunning: boolean;
    onStartTimer: () => void;
    onPauseTimer: () => void;
    onResetTimer: () => void;
}

const tools = [
    { id: 'whiteboard', name: 'Tableau Blanc', icon: Square },
    { id: 'document', name: 'Document', icon: FileText },
    { id: 'quiz', name: 'Quiz', icon: Award },
    { id: 'camera', name: 'Caméras', icon: Camera },
];

export function SessionHeader({ 
    sessionId, 
    isTeacher, 
    onEndSession,
    onLeaveSession,
    isEndingSession = false,
    isSharingScreen,
    onToggleScreenShare,
    activeTool,
    onToolChange,
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
    
    return (
        <header className="border-b bg-background/95 backdrop-blur-sm z-10 sticky top-0">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
                <div className='flex items-center gap-4 w-48'>
                    <h1 className="text-xl font-bold hidden sm:block">Session: <Badge variant="secondary">{sessionId.substring(0,8)}</Badge></h1>
                </div>

                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-4">
                     {isTeacher && (
                         <>
                            <div className="flex gap-1 p-1 rounded-lg bg-muted border">
                                <TooltipProvider>
                                    {tools.map((tool) => {
                                        const Icon = tool.icon;
                                        const isActive = activeTool === tool.id;
                                        return (
                                            <Tooltip key={tool.id}>
                                                <TooltipTrigger asChild>
                                                    <Button variant={isActive ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => onToolChange(tool.id)}>
                                                        <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent><p>{tool.name}</p></TooltipContent>
                                            </Tooltip>
                                        )
                                    })}
                                </TooltipProvider>
                            </div>
                            <VideoControls 
                                isSharingScreen={isSharingScreen} 
                                onToggleScreenShare={onToggleScreenShare} 
                            />
                         </>
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
