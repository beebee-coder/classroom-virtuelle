// src/components/session/ClassStudentList.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Wifi, WifiOff, User, Send } from 'lucide-react';
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
}

export function ClassStudentList({ classroom, onlineUserIds, currentUserId, activeParticipantIds, sessionId }: ClassStudentListProps) {
    const allStudents = classroom.eleves || [];

    return (
        <Card className="flex flex-col bg-background/80">
            <Accordion type="single" collapsible defaultValue="classStudents">
                <AccordionItem value="classStudents" className="border-b-0">
                    <AccordionTrigger className="p-6">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Users className="h-5 w-5" /> 
                            Classe {classroom.nom} 
                            <span className="text-sm font-normal text-muted-foreground ml-2">
                                ({onlineUserIds.length}/{allStudents.length} en ligne)
                            </span>
                        </CardTitle>
                    </AccordionTrigger>
                    <AccordionContent>
                        <CardContent className="space-y-3 overflow-y-auto max-h-80 pr-2 pb-2">
                            <TooltipProvider>
                                {allStudents.length > 0 ? (
                                    allStudents.map(student => {
                                        const isOnline = onlineUserIds.includes(student.id);
                                        const isParticipant = activeParticipantIds.includes(student.id);
                                        return (
                                            <StudentListItem 
                                                key={student.id}
                                                student={student}
                                                isOnline={isOnline}
                                                isParticipant={isParticipant}
                                                isCurrentUser={student.id === currentUserId}
                                                sessionId={sessionId}
                                                classroomId={classroom.id}
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
    isCurrentUser,
    sessionId,
    classroomId,
}: { 
    student: UserType; 
    isOnline: boolean;
    isParticipant: boolean;
    isCurrentUser: boolean;
    sessionId: string;
    classroomId: string;
}) {
    const displayName = student.name || student.email || 'Élève';
    const initials = displayName.charAt(0).toUpperCase();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const handleReinvite = () => {
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
            "flex items-center justify-between gap-3 p-2 rounded-lg transition-colors",
            isParticipant ? "bg-green-50 border border-green-200" : (isOnline ? "bg-blue-50 border border-blue-100" : "bg-muted/30")
        )}>
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <Avatar className="h-8 w-8">
                    <AvatarFallback className={cn(
                        "text-xs",
                        isParticipant ? "bg-green-100 text-green-800" : (isOnline ? "bg-blue-100 text-blue-800" : "bg-muted text-muted-foreground")
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
            
            {isOnline && !isParticipant && (
                <Button size="sm" variant="ghost" onClick={handleReinvite} disabled={isPending}>
                    <Send className="mr-2 h-4 w-4" />
                    Inviter
                </Button>
            )}

            {!isOnline && (
                 <Tooltip>
                    <TooltipTrigger>
                       <WifiOff className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Hors ligne</p>
                    </TooltipContent>
                </Tooltip>
            )}
        </div>
    );
}
