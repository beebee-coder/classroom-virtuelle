// src/components/session/ClassStudentList.tsx
'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Users, UserPlus, UserCheck, AlertCircle, Edit, Star } from 'lucide-react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import { reinviteStudentToSession } from '@/lib/actions/session.actions';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { cn } from '@/lib/utils';
import type { ClassroomWithDetails, SessionParticipant } from '@/types';

interface ClassStudentListProps {
    classroom: ClassroomWithDetails;
    onlineUserIds: string[];
    currentUserId: string;
    activeParticipantIds: string[];
    sessionId: string;
    waitingStudentCount: number;
    onSpotlightParticipant: (participantId: string) => void;
    spotlightedParticipantId: string | null;
    whiteboardControllerId: string | null;
    onWhiteboardControllerChange: (userId: string) => void;
}

export function ClassStudentList({
    classroom,
    onlineUserIds,
    currentUserId,
    activeParticipantIds,
    sessionId,
    waitingStudentCount,
    onSpotlightParticipant,
    spotlightedParticipantId,
    whiteboardControllerId,
    onWhiteboardControllerChange,
}: ClassStudentListProps) {
    const { toast } = useToast();
    const [accordionValue, setAccordionValue] = useState<string | undefined>('class-list');

    const handleReinvite = async (studentId: string) => {
        try {
            await reinviteStudentToSession(sessionId, studentId, classroom.id);
            toast({
                title: 'Invitation envoyée',
                description: `Une nouvelle invitation a été envoyée à l'élève.`,
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: "Impossible de ré-inviter l'élève.",
            });
        }
    };

    const sortedStudents = [...(classroom.eleves || [])].sort((a, b) => {
        const aOnline = onlineUserIds.includes(a.id);
        const bOnline = onlineUserIds.includes(b.id);
        if (aOnline && !bOnline) return -1;
        if (!aOnline && bOnline) return 1;
        return (b.points ?? 0) - (a.points ?? 0);
    });

    return (
        <Card className="bg-background/80">
            <Accordion type="single" collapsible value={accordionValue} onValueChange={setAccordionValue}>
                <AccordionItem value="class-list" className="border-b-0">
                    <AccordionTrigger className="p-6">
                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                            <Users className="h-5 w-5 text-primary" />
                            <span>Classe</span>
                            {waitingStudentCount > 0 && (
                                <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-amber-500 rounded-full animate-pulse">
                                    {waitingStudentCount}
                                </span>
                            )}
                        </CardTitle>
                    </AccordionTrigger>
                    <AccordionContent>
                        <CardContent className="space-y-2 pt-0 max-h-60 overflow-y-auto pr-4">
                            <TooltipProvider>
                                {sortedStudents.map(student => {
                                    const isOnline = onlineUserIds.includes(student.id);
                                    const isWaiting = isOnline && !activeParticipantIds.includes(student.id);
                                    const isSpotlighted = student.id === spotlightedParticipantId;
                                    const isController = student.id === whiteboardControllerId;

                                    return (
                                        <div key={student.id} className={cn("flex items-center justify-between p-2 rounded-lg", isWaiting ? "bg-amber-100 dark:bg-amber-900/30" : "bg-muted/50")}>
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Avatar className={cn("h-7 w-7 text-xs", isOnline && "border-2 border-green-500")}>
                                                    <AvatarFallback>{student.name?.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div className="truncate">
                                                    <p className="text-sm font-medium truncate">{student.name}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                {isWaiting && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleReinvite(student.id)}>
                                                                <UserPlus className="h-4 w-4 text-amber-600" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent><p>En attente, cliquer pour ré-inviter</p></TooltipContent>
                                                    </Tooltip>
                                                )}
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant={isController ? "default" : "ghost"} size="icon" className="h-7 w-7" onClick={() => onWhiteboardControllerChange(student.id)}>
                                                            <Edit className={cn("h-4 w-4", isController && "text-white")} />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent><p>Donner/Reprendre le contrôle du tableau</p></TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                         <Button variant={isSpotlighted ? "default" : "ghost"} size="icon" className="h-7 w-7" onClick={() => onSpotlightParticipant(student.id)}>
                                                            <Star className={cn("h-4 w-4", isSpotlighted && "text-white")} />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent><p>Mettre en vedette</p></TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </div>
                                    );
                                })}
                            </TooltipProvider>
                        </CardContent>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </Card>
    );
}
