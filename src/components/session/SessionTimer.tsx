// src/components/session/SessionTimer.tsx
'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Timer, Play, Pause, RotateCcw } from "lucide-react";
import { Input } from "../ui/input";

interface SessionTimerProps {
    sessionId: string;
    isTeacher: boolean;
    initialDuration: number;
    timeLeft: number;
    isTimerRunning: boolean;
    onStart: () => void;
    onPause: () => void;
    onReset: (newDuration?: number) => void;
}

function formatTime(seconds: number) {
    if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
        return "00:00";
    }
    
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function SessionTimer({ 
    sessionId,
    isTeacher,
    initialDuration,
    timeLeft,
    isTimerRunning,
    onStart,
    onPause,
    onReset,
}: SessionTimerProps) {
    const [customMinutes, setCustomMinutes] = useState<string>("10");

    useEffect(() => {
        if (typeof timeLeft !== 'number' || isNaN(timeLeft) || timeLeft < 0) {
            console.error('Invalid timeLeft value:', timeLeft);
        }
    }, [timeLeft]);

    const handleSetCustomTime = () => {
        const minutes = Number(customMinutes);
        
        if (isNaN(minutes) || minutes <= 0 || minutes > 1440) {
            console.error('Invalid custom minutes:', customMinutes);
            setCustomMinutes("10");
            return;
        }
        
        const durationInSeconds = minutes * 60;
        onReset(durationInSeconds);
    };
    
    const handlePresetClick = (minutes: number) => {
        const durationInSeconds = minutes * 60;
        onReset(durationInSeconds);
        if (!isTimerRunning) {
            onStart();
        }
    };

    const displayTimeLeft = typeof timeLeft === 'number' && !isNaN(timeLeft) && timeLeft >= 0 
        ? timeLeft 
        : 0;

    if (!isTeacher) {
        return (
             <Card className="bg-background/80">
                <CardHeader className="p-4">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Timer className="h-5 w-5" /> Minuteur
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-center">
                    <p className="text-4xl font-mono font-bold">
                        {formatTime(displayTimeLeft)}
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="bg-background/80">
             <Accordion type="single" collapsible defaultValue="timer">
                <AccordionItem value="timer" className="border-b-0">
                    <AccordionTrigger className="p-6">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Timer className="h-5 w-5" /> Minuteur de Session
                        </CardTitle>
                    </AccordionTrigger>
                    <AccordionContent>
                        <CardContent className="space-y-4 pt-0">
                            <div className="text-center">
                                 <p className="text-5xl font-mono font-bold">
                                    {formatTime(displayTimeLeft)}
                                 </p>
                            </div>
                           
                            <div className="flex justify-center gap-2">
                                {!isTimerRunning ? (
                                    <Button 
                                        onClick={onStart} 
                                        disabled={displayTimeLeft === 0} 
                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                    >
                                        <Play className="mr-2 h-4 w-4" /> Démarrer
                                    </Button>
                                ) : (
                                    <Button 
                                        onClick={onPause} 
                                        className="flex-1 bg-yellow-500 hover:bg-yellow-600"
                                    >
                                        <Pause className="mr-2 h-4 w-4" /> Pause
                                    </Button>
                                )}
                                <Button 
                                    onClick={() => onReset()} 
                                    variant="outline"
                                >
                                    <RotateCcw className="mr-2 h-4 w-4" /> Réinitialiser
                                </Button>
                            </div>
                            
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground">Préréglages</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {[5, 10, 15].map(min => (
                                        <Button 
                                            key={min} 
                                            variant="secondary" 
                                            size="sm" 
                                            onClick={() => handlePresetClick(min)}
                                        >
                                            {min} min
                                        </Button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                 <p className="text-xs font-medium text-muted-foreground">Personnalisé (minutes)</p>
                                <div className="flex gap-2">
                                    <Input 
                                        type="number" 
                                        value={customMinutes}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            if (value === "" || (Number(value) > 0 && Number(value) <= 1440)) {
                                                setCustomMinutes(value);
                                            }
                                        }}
                                        placeholder="Minutes"
                                        className="w-full"
                                        min="1"
                                        max="1440"
                                    />
                                    <Button 
                                        onClick={handleSetCustomTime}
                                        disabled={!customMinutes || Number(customMinutes) <= 0}
                                    >
                                        Appliquer
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </Card>
    );
}
