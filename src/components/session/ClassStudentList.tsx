// src/components/session/ClassStudentList.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Wifi, WifiOff, User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { User as UserType, ClassroomWithDetails } from '@/lib/types';

interface ClassStudentListProps {
    classroom: ClassroomWithDetails;
    onlineUserIds: string[];
    currentUserId: string;
}

export function ClassStudentList({ classroom, onlineUserIds, currentUserId }: ClassStudentListProps) {
    const allStudents = classroom.eleves || [];
    const onlineStudents = allStudents.filter(student => onlineUserIds.includes(student.id));
    const offlineStudents = allStudents.filter(student => !onlineUserIds.includes(student.id));

    return (
        <Card className="flex flex-col bg-background/80">
            <Accordion type="single" collapsible defaultValue="classStudents">
                <AccordionItem value="classStudents" className="border-b-0">
                    <AccordionTrigger className="p-6">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Users className="h-5 w-5" /> 
                            Classe {classroom.nom} 
                            <span className="text-sm font-normal text-muted-foreground ml-2">
                                ({onlineStudents.length}/{allStudents.length} en ligne)
                            </span>
                        </CardTitle>
                    </AccordionTrigger>
                    <AccordionContent>
                        <CardContent className="space-y-3 overflow-y-auto max-h-80 pr-2 pb-2">
                            <TooltipProvider>
                                {/* Élèves en ligne */}
                                {onlineStudents.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="text-xs font-medium text-green-600 flex items-center gap-1">
                                            <Wifi className="h-3 w-3" />
                                            En ligne ({onlineStudents.length})
                                        </div>
                                        {onlineStudents.map(student => (
                                            <StudentListItem 
                                                key={student.id}
                                                student={student}
                                                isOnline={true}
                                                isCurrentUser={student.id === currentUserId}
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* Élèves hors ligne */}
                                {offlineStudents.length > 0 && (
                                    <div className="space-y-2 mt-4">
                                        <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                            <WifiOff className="h-3 w-3" />
                                            Hors ligne ({offlineStudents.length})
                                        </div>
                                        {offlineStudents.map(student => (
                                            <StudentListItem 
                                                key={student.id}
                                                student={student}
                                                isOnline={false}
                                                isCurrentUser={student.id === currentUserId}
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* Message si aucun élève */}
                                {allStudents.length === 0 && (
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
    isCurrentUser 
}: { 
    student: UserType; 
    isOnline: boolean; 
    isCurrentUser: boolean;
}) {
    const displayName = student.name || student.email || 'Élève';
    const initials = displayName.charAt(0).toUpperCase();

    return (
        <div className={cn(
            "flex items-center justify-between gap-3 p-2 rounded-lg transition-colors",
            isOnline ? "bg-green-50 border border-green-100" : "bg-muted/30"
        )}>
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <Avatar className="h-8 w-8">
                    <AvatarFallback className={cn(
                        "text-xs",
                        isOnline ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"
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
            
            <Tooltip>
                <TooltipTrigger>
                    {isOnline ? (
                        <Wifi className="h-4 w-4 text-green-500" />
                    ) : (
                        <WifiOff className="h-4 w-4 text-muted-foreground" />
                    )}
                </TooltipTrigger>
                <TooltipContent>
                    <p>{isOnline ? 'En ligne' : 'Hors ligne'}</p>
                </TooltipContent>
            </Tooltip>
        </div>
    );
}