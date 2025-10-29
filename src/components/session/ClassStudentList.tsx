// src/components/session/ClassStudentList.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Wifi, WifiOff, User, Send, Hourglass, Star, Edit, Undo2 } from 'lucide-react';
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
    whiteboardControllerId: string | null;
    onWhiteboardControllerChange: (participantId: string) => void;
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
    spotlightedParticipantId,
    whiteboardControllerId,
    onWhiteboardControllerChange,
}: ClassStudentListProps) {
    const allStudents = classroom.eleves || [];
    const teacher = allStudents.find(u => u.id === classroom.professeurId);

    // Ajout du professeur à la liste pour l'affichage unifié
    const allUsersToList = teacher ? [teacher, ...allStudents.filter(s => s.id !== teacher.id)] : allStudents;

    return (
        <Card className="flex flex-col bg-background/80">
            <Accordion type="single" collapsible defaultValue="classStudents" onValueChange={(value: string) => onAccordionToggle(!!value)}>
                <AccordionItem value="classStudents" className="border-b-0">
                    <AccordionTrigger className="p-6">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Users className="h-5 w-5" /> 
                            Classe {classroom.nom} 
                            <span className="text-sm font-normal text-muted-foreground ml-2">
                                ({onlineUserIds.length}/{allUsersToList.length} en ligne)
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
                                {allUsersToList.length > 0 ? (
                                    allUsersToList.map(user => {
                                        const isOnline = onlineUserIds.includes(user.id);
                                        const isParticipant = activeParticipantIds.includes(user.id);
                                        const isWaiting = isOnline && !isParticipant;
                                        return (
                                            <StudentListItem 
                                                key={user.id}
                                                student={user}
                                                isOnline={isOnline}
                                                isParticipant={isParticipant}
                                                isWaiting={isWaiting}
                                                isCurrentUser={user.id === currentUserId}
                                                sessionId={sessionId}
                                                classroomId={classroom.id}
                                                onSpotlight={onSpotlightParticipant}
                                                isSpotlighted={user.id === spotlightedParticipantId}
                                                isWhiteboardController={user.id === whiteboardControllerId}
                                                onWhiteboardControllerChange={onWhiteboardControllerChange}
                                                isTeacher={user.role === 'PROFESSEUR'}
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
    isSpotlighted,
    isWhiteboardController,
    onWhiteboardControllerChange,
    isTeacher
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
    isWhiteboardController: boolean;
    onWhiteboardControllerChange: (participantId: string) => void;
    isTeacher: boolean;
}) {
    const displayName = student.name || student.email || 'Participant';
    const initials = displayName.charAt(0).toUpperCase();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const handleReinvite = () => {
        if(isTeacher) return;
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
            isWhiteboardController ? "bg-green-50 border-green-300" :
            isWaiting ? "bg-blue-50 border-blue-200" : 
            isParticipant ? "bg-gray-50 border-gray-200" : 
            "bg-muted/30 border-transparent"
        )}>
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <Avatar className="h-8 w-8">
                    <AvatarFallback className={cn("text-xs", !isOnline && "bg-muted text-muted-foreground")}>
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
                {isWaiting && !isTeacher && (
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
                        <Button size="icon" variant="ghost" onClick={() => onWhiteboardControllerChange(student.id)} className={cn("h-7 w-7", isWhiteboardController ? "text-green-600" : "text-muted-foreground")}>
                            {isWhiteboardController && isTeacher ? <Undo2 className="h-4 w-4" /> : <Edit className={cn(isWhiteboardController && "fill-current")} />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{isWhiteboardController ? (isTeacher ? 'Reprendre le contrôle' : 'A le contrôle') : 'Donner le contrôle'}</p>
                    </TooltipContent>
                </Tooltip>

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