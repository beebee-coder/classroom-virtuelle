// src/app/teacher/class/[id]/ClassPageClient.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CreateAnnouncementForm } from '@/components/CreateAnnouncementForm';
import { AddStudentForm } from './AddStudentForm';
import { BackButton } from '@/components/BackButton';
import { usePresenceForTeacher } from '@/hooks/usePresenceForTeacher';
import { AnnouncementCarousel } from '@/components/AnnouncementCarousel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Video } from 'lucide-react';
import { SessionLauncher } from './SessionLauncher';
import { StudentGrid } from './StudentGrid';
import type { User, Announcement } from '@prisma/client';
import type { ClassroomWithDetails } from '@/types';


type AnnouncementWithAuthor = Announcement & { author: { name: string | null } };

interface ClassPageClientProps {
    classroom: ClassroomWithDetails;
    teacher: User;
    announcements: AnnouncementWithAuthor[];
}

export default function ClassPageClient({ classroom, teacher, announcements }: ClassPageClientProps) {
    const { onlineUsers, isConnected, error: presenceError } = usePresenceForTeacher(
        teacher?.id, 
        classroom?.id,
        !!teacher?.id && !!classroom?.id
    );

    if (presenceError) {
        // Idéalement, afficher une notification à l'utilisateur
        console.error('❌ [CLIENT CLASSE] - Erreur de connexion temps réel:', presenceError);
    }
    
    return (
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <BackButton />
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            {classroom.nom || 'Classe sans nom'}
                        </h1>
                        <p className="text-muted-foreground">
                            Gérez vos élèves, annonces et sessions pour cette classe.
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <CreateAnnouncementForm classrooms={[{id: classroom.id, nom: classroom.nom}]} />
                    <AddStudentForm classroomId={classroom.id} />
                </div>
            </div>
            
            {announcements && announcements.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-2xl font-semibold tracking-tight mb-4">
                        Annonces de la classe ({announcements.length})
                    </h2>
                    <AnnouncementCarousel announcements={announcements} />
                </div>
            )}
            
            <Tabs defaultValue="manage" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="manage">
                        <Users className="mr-2 h-4 w-4" />
                        Gérer les Élèves
                    </TabsTrigger>
                    <TabsTrigger value="launch">
                        <Video className="mr-2 h-4 w-4" />
                        Lancer une Session
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="manage" className="mt-6">
                    <StudentGrid 
                        students={classroom.eleves || []} 
                        onlineStudentIds={onlineUsers}
                    />
                </TabsContent>
                <TabsContent value="launch" className="mt-6">
                    <SessionLauncher 
                        classroom={classroom}
                        teacher={teacher}
                        onlineStudents={onlineUsers}
                    />
                </TabsContent>
            </Tabs>
        </main>
    );
}
