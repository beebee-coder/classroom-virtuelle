// src/components/StudentPageClient.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bell, Trophy, Users, KeyRound } from 'lucide-react';
import { CareerSelector } from './CareerSelector';
import { TaskBoard } from './TaskBoard';
import { AnnouncementCarousel } from './AnnouncementCarousel';
import type { User as PrismaUser, Metier as PrismaMetier, Announcement as PrismaAnnouncement, StudentProgress as PrismaStudentProgress, Task as PrismaTask, Classroom, EtatEleve } from '@prisma/client';
import type { Session } from 'next-auth';
import { useAblyPresence } from '@/hooks/useAblyPresence';
import { useEffect } from 'react';
import { ChatSheet } from './ChatSheet';
import { SessionInvitationListener } from './SessionInvitationListener';

type StudentWithDetails = PrismaUser & {
    classe: Classroom | null;
    etat: (EtatEleve & { metier: PrismaMetier | null }) | null;
    studentProgress: PrismaStudentProgress[];
};

type AnnouncementWithAuthor = PrismaAnnouncement & {
    author: { name: string | null };
};

interface StudentPageClientProps {
    student: StudentWithDetails;
    announcements: AnnouncementWithAuthor[];
    allCareers: PrismaMetier[];
    isTeacherView: boolean;
    tasks: PrismaTask[];
    user: Session['user'];
}

export default function StudentPageClient({ 
    student, 
    announcements, 
    allCareers, 
    isTeacherView, 
    tasks,
    user,
}: StudentPageClientProps) {
    const [activeTab, setActiveTab] = useState('tasks');
    const classeId = student.classe?.id;

    const { enterPresence, isConnected: presenceConnected } = useAblyPresence(
        classeId,
        !isTeacherView && !!classeId && !!user,
        'StudentPageClient'
    );

    useEffect(() => {
        if (!isTeacherView && presenceConnected && user && user.role === 'ELEVE' && classeId) {
            enterPresence({
                name: user.name || 'Élève',
                role: user.role,
                image: user.image || null,
            });
        }
    }, [presenceConnected, user, classeId, isTeacherView, enterPresence]);

    const metier = student.etat?.metier;
    const completedTasks = student.studentProgress?.filter(p => p.status === 'VERIFIED').length || 0;
    const totalPoints = student.points || 0;

    // ✅ URL de fallback corrigée (espace supprimé)
    const fallbackAvatarUrl = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(student.id)}`;

    return (
        <div className="container mx-auto p-6 space-y-6">
            <Card>
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                        <div className="flex items-center space-x-4">
                            <Avatar className="h-16 w-16">
                                <AvatarImage 
                                    src={student.image || fallbackAvatarUrl} 
                                    alt={student.name || 'Élève'} 
                                />
                                <AvatarFallback>
                                    {student.name?.charAt(0)?.toUpperCase() || 'E'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <h1 className="text-2xl font-bold">{student.name}</h1>
                                <p className="text-muted-foreground">{student.email}</p>
                                <div className="flex items-center space-x-4 mt-2">
                                    <div className="flex items-center space-x-1">
                                        <Trophy className="h-4 w-4 text-yellow-500" aria-hidden="true" />
                                        <span>{totalPoints} points</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <Bell className="h-4 w-4 text-blue-500" aria-hidden="true" />
                                        <span>{completedTasks} tâches validées</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ✅ Actions à droite (responsive) */}
                        <div className="flex flex-wrap gap-2 items-center">
                            {/* ✅ ChatSheet déplacé ici pour stabilité */}
                            {classeId && user.role === 'ELEVE' && (
                                <ChatSheet classroomId={classeId} userId={user.id} userRole={user.role} />
                            )}
                            
                            {isTeacherView ? (
                                <CareerSelector 
                                    careers={allCareers} 
                                    studentId={student.id} 
                                    currentCareerId={metier?.id || null} 
                                />
                            ) : (
                                <>
                                    {student.classe && (
                                        <Button 
                                            asChild 
                                            variant="outline"
                                            aria-label="Accéder à ma classe"
                                        >
                                            <a href={`/student/class/${student.classe.id}`}>
                                                <Users className="mr-2 h-4 w-4" aria-hidden="true" />
                                                Ma Classe
                                            </a>
                                        </Button>
                                    )}
                                    <Button 
                                        asChild 
                                        variant="outline"
                                        aria-label="Accéder à l'espace parent"
                                    >
                                        <a href={`/student/${student.id}/parent`}>
                                            <KeyRound className="mr-2 h-4 w-4" aria-hidden="true" />
                                            Espace Parent
                                        </a>
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="tasks">Mes Tâches</TabsTrigger>
                    <TabsTrigger value="announcements">Annonces</TabsTrigger>
                </TabsList>

                <TabsContent value="tasks" className="space-y-4">
                    <TaskBoard 
                        tasks={tasks}
                        studentProgress={student.studentProgress || []}
                        studentId={student.id}
                    />
                </TabsContent>

                <TabsContent value="announcements" className="space-y-4">
                    {announcements.length === 0 ? (
                        <Card>
                            <CardContent className="p-6 text-center">
                                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                                <h3 className="text-lg font-semibold">Aucune annonce</h3>
                                <p className="text-muted-foreground">Les annonces de votre classe apparaîtront ici</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <AnnouncementCarousel announcements={announcements} />
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}