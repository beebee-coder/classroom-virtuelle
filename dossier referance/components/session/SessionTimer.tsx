// src/components/session/SessionTimer.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Timer, Play, Pause, RotateCcw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { broadcastTimerEvent } from '@/lib/actions';
import { pusherClient } from '@/lib/pusher/client';

interface SessionTimerProps {
    sessionId: string;
    isTeacher: boolean;
    initialDuration: number;
}

function formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function SessionTimer({ 
    sessionId,
    isTeacher,
    initialDuration,
}: SessionTimerProps) {
    const [duration, setDuration] = useState(initialDuration);
    const [timeLeft, setTimeLeft] = useState(duration);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Pusher listener effect
    useEffect(() => {
        if (!sessionId) return;
        const channelName = `presence-session-${sessionId}`;
        const channel = pusherClient.subscribe(channelName);
        
        channel.bind('timer-started', () => setIsTimerRunning(true));
        channel.bind('timer-paused', () => setIsTimerRunning(false));
        channel.bind('timer-reset', (data: { duration: number }) => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            setIsTimerRunning(false);
            setDuration(data.duration);
            setTimeLeft(data.duration);
        });

        return () => {
            channel.unbind_all();
            pusherClient.unsubscribe(channelName);
        }
    }, [sessionId]);

    // Timer logic effect
    useEffect(() => {
        if (isTimerRunning) {
            timerIntervalRef.current = setInterval(() => {
                setTimeLeft(prevTimeLeft => {
                    if (prevTimeLeft <= 1) {
                        clearInterval(timerIntervalRef.current!);
                        timerIntervalRef.current = null;
                        setIsTimerRunning(false);
                        return 0;
                    }
                    return prevTimeLeft - 1;
                });
            }, 1000);
        } else if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }

        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
        };
    }, [isTimerRunning]);


    const handleStart = () => {
        if (!isTeacher) return;
        setIsTimerRunning(true);
        broadcastTimerEvent(sessionId, 'timer-started');
    };

    const handlePause = () => {
        if (!isTeacher) return;
        setIsTimerRunning(false);
        broadcastTimerEvent(sessionId, 'timer-paused');
    };

    const handleReset = () => {
        if (!isTeacher) return;
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        setTimeLeft(duration);
        setIsTimerRunning(false);
        broadcastTimerEvent(sessionId, 'timer-reset', { duration });
    };

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
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleStart} disabled={timeLeft === 0}>
                                        <Play className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Démarrer</TooltipContent>
                            </Tooltip>
                        ) : (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePause}>
                                        <Pause className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Pauser</TooltipContent>
                            </Tooltip>
                        )}
                         <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleReset}>
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
