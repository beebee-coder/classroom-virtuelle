// src/components/session/ClassStudentList.tsx
'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Users, UserPlus, Edit, Star } from 'lucide-react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import { reinviteStudentToSession } from '@/lib/actions/session.actions';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { cn } from '@/lib/utils';
import type { ClassroomWithDetails } from '@/types';

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
    const [isReinviting, setIsReinviting] = useState<string | null>(null);

    // CORRECTION : Gestion optimisée de la réinvitation avec état de chargement
    const handleReinvite = useCallback(async (studentId: string) => {
        if (isReinviting) return; // Éviter les doubles clics
        
        setIsReinviting(studentId);
        try {
            await reinviteStudentToSession(sessionId, studentId, classroom.id);
            toast({
                title: 'Invitation envoyée',
                description: `Une nouvelle invitation a été envoyée à l'élève.`,
            });
        } catch (error) {
            console.error('❌ [CLASS STUDENT LIST] - Erreur réinvitation:', error);
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: "Impossible de ré-inviter l'élève.",
            });
        } finally {
            setIsReinviting(null);
        }
    }, [sessionId, classroom.id, toast, isReinviting]);

    // CORRECTION : Tri optimisé des étudiants
    const sortedStudents = useCallback(() => {
        return [...(classroom.eleves || [])].sort((a, b) => {
            const aOnline = onlineUserIds.includes(a.id);
            const bOnline = onlineUserIds.includes(b.id);
            
            // Priorité 1: Élèves en ligne
            if (aOnline && !bOnline) return -1;
            if (!aOnline && bOnline) return 1;
            
            // Priorité 2: Points (décroissant)
            const aPoints = a.points ?? 0;
            const bPoints = b.points ?? 0;
            if (bPoints !== aPoints) return bPoints - aPoints;
            
            // Priorité 3: Ordre alphabétique
            return (a.name || '').localeCompare(b.name || '');
        });
    }, [classroom.eleves, onlineUserIds]);

    // CORRECTION : Gestion du spotlight avec validation
    const handleSpotlight = useCallback((studentId: string) => {
        if (studentId && typeof onSpotlightParticipant === 'function') {
            onSpotlightParticipant(studentId);
        }
    }, [onSpotlightParticipant]);

    // CORRECTION : Gestion du contrôle du tableau blanc avec validation
    const handleWhiteboardControl = useCallback((studentId: string) => {
        if (studentId && typeof onWhiteboardControllerChange === 'function') {
            onWhiteboardControllerChange(studentId);
        }
    }, [onWhiteboardControllerChange]);

    return (
        <Card className="bg-background/80 backdrop-blur-sm border-border/50">
            <Accordion 
                type="single" 
                collapsible 
                value={accordionValue} 
                onValueChange={setAccordionValue}
            >
                <AccordionItem value="class-list" className="border-b-0">
                    <AccordionTrigger className="p-6 hover:no-underline">
                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                            <Users className="h-5 w-5 text-primary" />
                            <span>Classe</span>
                            {waitingStudentCount > 0 && (
                                <span 
                                    className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-amber-500 rounded-full animate-pulse"
                                    aria-label={`${waitingStudentCount} élève(s) en attente`}
                                >
                                    {waitingStudentCount}
                                </span>
                            )}
                        </CardTitle>
                    </AccordionTrigger>
                    <AccordionContent className="pt-0">
                        <CardContent className="space-y-2 pt-0 max-h-60 overflow-y-auto pr-4">
                            <TooltipProvider delayDuration={300}>
                                {sortedStudents().map((student) => {
                                    const isOnline = onlineUserIds.includes(student.id);
                                    const isWaiting = isOnline && !activeParticipantIds.includes(student.id);
                                    const isSpotlighted = student.id === spotlightedParticipantId;
                                    const isController = student.id === whiteboardControllerId;
                                    const isReinvitingStudent = isReinviting === student.id;

                                    return (
                                        <div 
                                            key={student.id} 
                                            className={cn(
                                                "flex items-center justify-between p-2 rounded-lg transition-colors duration-200",
                                                isWaiting 
                                                    ? "bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700" 
                                                    : "bg-muted/50 border border-transparent",
                                                isOnline && "ring-1 ring-green-200 dark:ring-green-800"
                                            )}
                                            aria-label={`Élève ${student.name}, ${isOnline ? 'en ligne' : 'hors ligne'}`}
                                        >
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <Avatar 
                                                    className={cn(
                                                        "h-7 w-7 text-xs transition-all",
                                                        isOnline 
                                                            ? "border-2 border-green-500 shadow-sm" 
                                                            : "border border-muted-foreground/30 opacity-70"
                                                    )}
                                                >
                                                    <AvatarFallback className="text-[10px] font-medium">
                                                        {student.name?.charAt(0).toUpperCase() || '?'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="truncate min-w-0">
                                                    <p className="text-sm font-medium truncate">
                                                        {student.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {student.points ?? 0} pts
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                                                {isWaiting && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-7 w-7" 
                                                                onClick={() => handleReinvite(student.id)}
                                                                disabled={isReinvitingStudent}
                                                                aria-label={`Réinviter ${student.name}`}
                                                            >
                                                                <UserPlus className={cn(
                                                                    "h-4 w-4 text-amber-600",
                                                                    isReinvitingStudent && "animate-spin"
                                                                )} />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>En attente, cliquer pour ré-inviter</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )}
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button 
                                                            variant={isController ? "default" : "ghost"} 
                                                            size="icon" 
                                                            className="h-7 w-7" 
                                                            onClick={() => handleWhiteboardControl(student.id)}
                                                            aria-label={isController ? `Retirer le contrôle du tableau à ${student.name}` : `Donner le contrôle du tableau à ${student.name}`}
                                                        >
                                                            <Edit className={cn(
                                                                "h-4 w-4",
                                                                isController ? "text-white" : "text-muted-foreground"
                                                            )} />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{isController ? "Retirer le contrôle" : "Donner le contrôle du tableau"}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button 
                                                            variant={isSpotlighted ? "default" : "ghost"} 
                                                            size="icon" 
                                                            className="h-7 w-7" 
                                                            onClick={() => handleSpotlight(student.id)}
                                                            aria-label={isSpotlighted ? `Retirer la vedette de ${student.name}` : `Mettre ${student.name} en vedette`}
                                                        >
                                                            <Star className={cn(
                                                                "h-4 w-4",
                                                                isSpotlighted ? "text-white" : "text-muted-foreground"
                                                            )} />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{isSpotlighted ? "Retirer la vedette" : "Mettre en vedette"}</p>
                                                    </TooltipContent>
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
