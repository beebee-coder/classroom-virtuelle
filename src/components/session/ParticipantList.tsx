
// src/components/session/ParticipantList.tsx
'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users, Wifi, WifiOff } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Role } from '@prisma/client';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';

type SessionParticipant = {
    id: string;
    name?: string | null;
    role?: Role;
};


interface ParticipantListProps {
    allSessionUsers: SessionParticipant[];
    onlineUserIds: string[];
    currentUserId: string;
}

export function ParticipantList({ allSessionUsers, onlineUserIds, currentUserId }: ParticipantListProps) {
    return (
        <Card className="flex flex-col bg-background/80">
             <Accordion type="single" collapsible defaultValue="participants">
                <AccordionItem value="participants" className="border-b-0">
                    <AccordionTrigger className="p-6">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Users /> Participants ({onlineUserIds.length})
                        </CardTitle>
                    </AccordionTrigger>
                    <AccordionContent>
                        <CardContent className="space-y-3 overflow-y-auto pr-2 pb-2">
                        <TooltipProvider>
                            {allSessionUsers.map(user => {
                                const isOnline = onlineUserIds.includes(user.id);
                                return (
                                    <div key={user.id} className="flex items-center justify-between gap-3">
                                        <div className='flex items-center gap-3'>
                                            <Avatar className="h-8 w-8">
                                                <AvatarFallback>{user?.name?.charAt(0) ?? '?'}</AvatarFallback>
                                            </Avatar>
                                            <span className={cn("text-sm font-medium", !isOnline && "text-muted-foreground")}>
                                                {user.name ?? 'Utilisateur'} {user.id === currentUserId ? '(Vous)' : ''}
                                            </span>
                                        </div>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                {isOnline ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-muted-foreground" />}
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{isOnline ? 'En ligne' : 'Hors ligne'}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                )
                            })}
                        </TooltipProvider>
                        </CardContent>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </Card>
    );
}
