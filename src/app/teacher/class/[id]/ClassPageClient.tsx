// src/app/teacher/class/[id]/ClassPageClient.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CreateAnnouncementForm } from '@/components/CreateAnnouncementForm';
import { AddStudentForm } from './AddStudentForm';
import { BackButton } from '@/components/BackButton';
import { AnnouncementCarousel } from '@/components/AnnouncementCarousel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Video } from 'lucide-react';
import { SessionLauncher } from './SessionLauncher';
import { StudentGrid } from './StudentGrid';
import { type User, type Announcement, Role } from '@prisma/client';
import type { ClassroomWithDetails } from '@/types';
import { useAblyPresence } from '@/hooks/useAblyPresence';

type AnnouncementWithAuthor = Announcement & { author: { name: string | null } };

interface ClassPageClientProps {
    classroom: ClassroomWithDetails;
    teacher: User;
    announcements: AnnouncementWithAuthor[];
}

export default function ClassPageClient({ classroom, teacher, announcements }: ClassPageClientProps) {
    const [hasEnteredPresence, setHasEnteredPresence] = useState(false);
    
    // La logique des élèves en attente est maintenant sur /teacher/validations
    // On n'affiche que les élèves validés ici.
    const validatedStudents = useMemo(() => 
        classroom.eleves || [],
        [classroom.eleves]
    );

    const { 
        onlineMembers, 
        isConnected, 
        error: presenceError,
        enterPresence,
        isLoading 
    } = useAblyPresence(
        classroom?.id,
        !!classroom?.id,
        'ClassPageClient'
    );

    useEffect(() => {
        if (isConnected && classroom?.id && teacher && !hasEnteredPresence && !isLoading) {
            const enterPresenceWithRetry = async () => {
                try {
                    await enterPresence({
                        name: teacher.name || 'Professeur',
                        role: Role.PROFESSEUR,
                        image: teacher.image,
                        data: {
                            userId: teacher.id,
                            role: Role.PROFESSEUR,
                            classroomId: classroom.id
                        }
                    });
                    setHasEnteredPresence(true);
                } catch (error) {
                    console.warn("Retrying presence entry...");
                    setTimeout(() => setHasEnteredPresence(false), 3000);
                }
            };
            enterPresenceWithRetry();
        }
    }, [isConnected, classroom?.id, teacher, enterPresence, isLoading, hasEnteredPresence]);

    const { onlineStudentIds } = useMemo(() => {
        const ids: string[] = [];
        onlineMembers.forEach(member => {
            const memberRole = member.data?.role || member.role;
            const userId = member.data?.userId || member.id;
            if (memberRole === Role.ELEVE) {
                const student = classroom.eleves?.find(s => s.id === userId);
                if (student) ids.push(student.id);
            }
        });
        return { onlineStudentIds: [...new Set(ids)] };
    }, [onlineMembers, classroom.eleves]);


    useEffect(() => {
        if (presenceError) {
            console.error('❌ [CLIENT CLASSE] - Erreur Ably:', presenceError);
        }
    }, [presenceError]);

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
            
            <Tabs defaultValue="students" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="students">
                        <Users className="mr-2 h-4 w-4" />
                        Élèves ({validatedStudents.length})
                    </TabsTrigger>
                    <TabsTrigger value="launch">
                        <Video className="mr-2 h-4 w-4" />
                        Lancer une Session
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="students" className="mt-6">
                    <StudentGrid 
                        students={validatedStudents} 
                        onlineStudentIds={onlineStudentIds}
                    />
                </TabsContent>
                <TabsContent value="launch" className="mt-6">
                    <SessionLauncher 
                        classroom={classroom}
                        teacher={teacher}
                        onlineStudents={onlineStudentIds}
                    />
                </TabsContent>
            </Tabs>
        </main>
    );
}
