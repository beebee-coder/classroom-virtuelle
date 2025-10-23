// src/components/session/SessionTimer.tsx
'use client';

import { Button } from "@/components/ui/button";
import { Timer, Play, Pause, RotateCcw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

interface SessionTimerProps {
    sessionId: string;
    isTeacher: boolean;
    initialDuration: number;
    timeLeft: number;
    isTimerRunning: boolean;
    onStart: () => void;
    onPause: () => void;
    onReset: () => void;
}

function formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function SessionTimer({ 
    sessionId,
    isTeacher,
    timeLeft,
    isTimerRunning,
    onStart,
    onPause,
    onReset,
}: SessionTimerProps) {
    return (
        <div className="flex items-center gap-2 p-1 rounded-lg bg-muted border">
            <div className="flex items-center gap-1 text-foreground px-2">
                <Timer className="h-4 w-4" />
                <p className="text-sm font-mono font-semibold w-14">{formatTime(timeLeft)}</p>
            </div>
            {isTeacher && (
                <TooltipProvider delayDuration={100}>
                    <div className="flex items-center gap-1">
                        {!isTimerRunning ? (
                             <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onStart} disabled={timeLeft === 0}>
                                        <Play className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Démarrer</TooltipContent>
                            </Tooltip>
                        ) : (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onPause}>
                                        <Pause className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Pauser</TooltipContent>
                            </Tooltip>
                        )}
                         <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onReset}>
                                    <RotateCcw className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Réinitialiser</TooltipContent>
                        </Tooltip>
                    </div>
                </TooltipProvider>
            )}
        </div>
    );
}
