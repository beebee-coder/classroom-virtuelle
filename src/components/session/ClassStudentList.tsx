// src/components/session/ClassStudentList.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Wifi, WifiOff, User, Send, Hourglass, Star } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { User as UserType } from '@prisma/client';
import type { ClassroomWithDetails } from '@/types';
import { Button } from '../ui/button';
import { reinviteStudentToSession } from '@/lib/actions/session.actions';
import { useToast } from '@/hooks/use-toast';
import { useTransition } from 'react';

interface ClassStudentListProps {
    classroom: ClassroomWithDetails;
    onlineUserIds: string[];
    currentUserId: string;
    activeParticipantIds: string[];
    sessionId: string;
    hasWaitingStudents: boolean;
    onAccordionToggle: (isOpen: boolean) => void;
    onSpotlightParticipant: (participantId: string) => void;
    spotlightedParticipantId: string | null;
}

export function ClassStudentList({ 
    classroom, 
    onlineUserIds, 
    currentUserId, 
    activeParticipantIds, 
    sessionId,
    hasWaitingStudents,
    onAccordionToggle,
    onSpotlightParticipant,
    spotlightedParticipantId
}: ClassStudentListProps) {
    const allStudents = classroom.eleves || [];
    const teacher = allStudents.find(u => u.id === classroom.professeurId);

    return (
        <Card className="flex flex-col bg-background/80">
            <Accordion type="single" collapsible defaultValue="classStudents" onValueChange={(value: string) => onAccordionToggle(!!value)}>
                <AccordionItem value="classStudents" className="border-b-0">
                    <AccordionTrigger className="p-6">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Users className="h-5 w-5" /> 
                            Classe {classroom.nom} 
                            <span className="text-sm font-normal text-muted-foreground ml-2">
                                ({onlineUserIds.length}/{allStudents.length} en ligne)
                            </span>
                             {hasWaitingStudents && (
                                <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white text-xs font-bold animate-pulse">
                                    {onlineUserIds.filter(id => !activeParticipantIds.includes(id)).length}
                                </span>
                            )}
                        </CardTitle>
                    </AccordionTrigger>
                    <AccordionContent>
                        <CardContent className="space-y-3 overflow-y-auto max-h-80 pr-2 pb-2">
                            <TooltipProvider>
                                {allStudents.length > 0 ? (
                                    allStudents.map(student => {
                                        const isOnline = onlineUserIds.includes(student.id);
                                        const isParticipant = activeParticipantIds.includes(student.id);
                                        const isWaiting = isOnline && !isParticipant;
                                        return (
                                            <StudentListItem 
                                                key={student.id}
                                                student={student}
                                                isOnline={isOnline}
                                                isParticipant={isParticipant}
                                                isWaiting={isWaiting}
                                                isCurrentUser={student.id === currentUserId}
                                                sessionId={sessionId}
                                                classroomId={classroom.id}
                                                onSpotlight={onSpotlightParticipant}
                                                isSpotlighted={student.id === spotlightedParticipantId}
                                            />
                                        )
                                    })
                                ) : (
                                    <div className="text-center text-muted-foreground py-4">
                                        <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">Aucun élève dans cette classe</p>
                                    </div>
                                )}
                            </TooltipProvider>
                        </CardContent>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </Card>
    );
}

// Composant interne pour afficher un élève
function StudentListItem({ 
    student, 
    isOnline,
    isParticipant,
    isWaiting,
    isCurrentUser,
    sessionId,
    classroomId,
    onSpotlight,
    isSpotlighted
}: { 
    student: UserType; 
    isOnline: boolean;
    isParticipant: boolean;
    isWaiting: boolean;
    isCurrentUser: boolean;
    sessionId: string;
    classroomId: string;
    onSpotlight: (participantId: string) => void;
    isSpotlighted: boolean;
}) {
    const displayName = student.name || student.email || 'Élève';
    const initials = displayName.charAt(0).toUpperCase();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const handleReinvite = () => {
        console.log(`✉️ [CLIENT] Clic pour ré-inviter ${student.name} (${student.id})`);
        startTransition(async () => {
            try {
                await reinviteStudentToSession(sessionId, student.id, classroomId);
                toast({
                    title: "Invitation envoyée",
                    description: `${student.name} a été invité(e) à rejoindre la session.`,
                });
            } catch {
                toast({
                    variant: "destructive",
                    title: "Erreur",
                    description: "Impossible d'envoyer l'invitation.",
                });
            }
        });
    };

    return (
        <div className={cn(
            "flex items-center justify-between gap-3 p-2 rounded-lg transition-colors border",
            isSpotlighted ? "bg-amber-50 border-amber-300" :
            isWaiting ? "bg-blue-50 border-blue-200" :
            isParticipant ? "bg-green-50 border-green-200" : 
            "bg-muted/30 border-transparent"
        )}>
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <Avatar className="h-8 w-8">
                    <AvatarFallback className={cn(
                        "text-xs",
                        isSpotlighted ? "bg-amber-100 text-amber-800" :
                        isWaiting ? "bg-blue-100 text-blue-800" :
                        isParticipant ? "bg-green-100 text-green-800" : 
                        "bg-muted text-muted-foreground"
                    )}>
                        {initials}
                    </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className={cn(
                                "text-sm font-medium truncate block",
                                !isOnline && "text-muted-foreground",
                                isCurrentUser && "font-bold text-primary"
                            )}>
                                {displayName}
                                {isCurrentUser && ' (Vous)'}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{displayName}</p>
                            {student.points !== undefined && (
                                <p className="text-xs">{student.points} points</p>
                            )}
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>
            
            <div className='flex items-center gap-1'>
                {isWaiting && (
                     <Tooltip>
                        <TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" onClick={handleReinvite} disabled={isPending} className="h-7 w-7 text-blue-600">
                                <Send className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Inviter à la session</p>
                        </TooltipContent>
                    </Tooltip>
                )}
                 <Tooltip>
                    <TooltipTrigger asChild>
                        <Button size="icon" variant="ghost" onClick={() => onSpotlight(student.id)} className={cn("h-7 w-7", isSpotlighted ? "text-amber-500" : "text-muted-foreground")}>
                            <Star className={cn(isSpotlighted && "fill-current")} />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Mettre en vedette</p>
                    </TooltipContent>
                </Tooltip>

                {!isOnline ? (
                     <Tooltip>
                        <TooltipTrigger>
                           <WifiOff className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Hors ligne</p>
                        </TooltipContent>
                    </Tooltip>
                ) : isParticipant ? (
                     <Tooltip>
                        <TooltipTrigger>
                           <div className="h-2 w-2 rounded-full bg-green-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Participe</p>
                        </TooltipContent>
                    </Tooltip>
                ) : (
                     <Tooltip>
                        <TooltipTrigger>
                           <Hourglass className="h-4 w-4 text-blue-600" />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>En attente</p>
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>
        </div>
    );
}
