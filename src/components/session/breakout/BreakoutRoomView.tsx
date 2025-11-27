// src/components/session/breakout/BreakoutRoomView.tsx
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ClipboardList, User } from 'lucide-react';
import type { BreakoutRoom } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BreakoutRoomViewProps {
    room: BreakoutRoom;
}

export function BreakoutRoomView({ room }: BreakoutRoomViewProps) {
    if (!room) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">En attente d'assignation à un groupe...</p>
            </div>
        );
    }

    return (
        <div className="h-full w-full flex items-center justify-center p-4 md:p-8 bg-muted/30">
            <Card className="w-full max-w-2xl shadow-2xl animate-in fade-in-50 zoom-in-95">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                        <Users className="h-10 w-10 text-primary" />
                    </div>
                    <CardTitle className="text-3xl font-bold">
                        Groupe de Travail : {room.name}
                    </CardTitle>
                    <CardDescription className="text-lg">
                        Vous êtes maintenant dans votre groupe de travail.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="p-4 bg-background border rounded-lg">
                        <h3 className="font-semibold text-lg flex items-center gap-2 mb-2">
                            <ClipboardList className="h-5 w-5" />
                            Votre Tâche
                        </h3>
                        <p className="text-muted-foreground">
                            {room.task || "Aucune tâche spécifique n'a été assignée."}
                        </p>
                    </div>

                    <div className="p-4 bg-background border rounded-lg">
                         <h3 className="font-semibold text-lg mb-3">
                            Membres du Groupe ({room.participants.length})
                        </h3>
                        <ScrollArea className="h-40">
                            <div className="space-y-3 pr-4">
                                {room.participants.map(participant => (
                                    <div key={participant.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-md">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={participant.image || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${participant.id}`} />
                                            <AvatarFallback>{participant.name?.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium text-sm">{participant.name}</span>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
