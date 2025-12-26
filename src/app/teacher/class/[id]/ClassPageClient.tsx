// src/app/teacher/class/[id]/ClassPageClient.tsx - VERSION CORRIGÉE POUR LA PRÉSENCE
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
    const [presenceEnterAttempts, setPresenceEnterAttempts] = useState(0);
    
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
            console.log('👨‍🏫 [CLASSE] - Tentative d\'entrée en présence du professeur');
            
            const enterPresenceWithRetry = async () => {
                try {
                    await enterPresence({
                        name: teacher.name || 'Professeur',
                        role: Role.PROFESSEUR,
                        image: teacher.image,
                        data: { userId: teacher.id }
                    });
                    console.log('✅ [CLASSE] - Professeur entré avec succès dans la présence');
                    setHasEnteredPresence(true);
                    setPresenceEnterAttempts(0); 
                } catch (error) {
                    console.error('❌ [CLASSE] - Erreur lors de l\'entrée en présence:', error);
                    setPresenceEnterAttempts(prev => prev + 1);
                    
                    if (presenceEnterAttempts < 3) {
                        const retryDelay = Math.min(1000 * Math.pow(2, presenceEnterAttempts), 10000);
                        console.log(`🔄 [CLASSE] - Nouvelle tentative dans ${retryDelay}ms (tentative ${presenceEnterAttempts + 1}/3)`);
                        setTimeout(() => {
                            setHasEnteredPresence(false);
                        }, retryDelay);
                    } else {
                        console.error('💥 [CLASSE] - Échec après 3 tentatives d\'entrée en présence');
                    }
                }
            };

            enterPresenceWithRetry();
        }
    }, [isConnected, classroom?.id, teacher, enterPresence, isLoading, hasEnteredPresence, presenceEnterAttempts]);

    const { onlineStudentIds, onlineTeacherIds } = useMemo(() => {
        const onlineStudentIds: string[] = [];
        const onlineTeacherIds: string[] = [];
        
        onlineMembers.forEach(member => {
            const memberRole = member.role;
            const memberUserId = member.data?.userId || member.id;

            if (memberRole === Role.PROFESSEUR) {
                onlineTeacherIds.push(memberUserId);
            } else if (memberRole === Role.ELEVE) {
                const studentExists = classroom.eleves?.some(s => s.id === memberUserId);
                if (studentExists) {
                    onlineStudentIds.push(memberUserId);
                }
            }
        });
        
        const uniqueStudentIds = [...new Set(onlineStudentIds)];
        const uniqueTeacherIds = [...new Set(onlineTeacherIds)];
        
        return {
            onlineStudentIds: uniqueStudentIds,
            onlineTeacherIds: uniqueTeacherIds
        };
    }, [onlineMembers, classroom.eleves, teacher.id]);


    const presenceStats = useMemo(() => {
        const totalStudents = classroom.eleves?.length || 0;
        const onlineStudents = onlineStudentIds.length;
        const teachersOnline = onlineTeacherIds.length;
        const totalOnline = onlineMembers.length;
        
        return {
            totalStudents,
            onlineStudents,
            teachersOnline,
            totalOnline,
            onlinePercentage: totalStudents > 0 ? Math.round((onlineStudents / totalStudents) * 100) : 0
        };
    }, [onlineMembers, onlineStudentIds, onlineTeacherIds, classroom.eleves]);

    useEffect(() => {
        if (presenceError) {
            console.error('❌ [CLIENT CLASSE] - Erreur de connexion temps réel Ably:', presenceError);
        }
    }, [presenceError]);

    const getConnectionStatus = () => {
        if (isLoading) return { text: '⚡ Connexion en cours...', color: 'text-yellow-600' };
        if (!isConnected) return { text: '🔌 Déconnecté', color: 'text-red-600' };
        if (presenceError) return { text: '⚠️ Connexion instable', color: 'text-orange-600' };
        
        return { 
            text: `● En ligne (${presenceStats.onlineStudents}/${presenceStats.totalStudents} élèves)`,
            color: 'text-green-600' 
        };
    };

    const connectionStatus = getConnectionStatus();
    
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
                            <span className={`ml-2 ${connectionStatus.color}`}>
                                {connectionStatus.text}
                            </span>
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
                        Gérer les Élèves ({presenceStats.onlineStudents}/{presenceStats.totalStudents} en ligne)
                    </TabsTrigger>
                    <TabsTrigger value="launch">
                        <Video className="mr-2 h-4 w-4" />
                        Lancer une Session
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="manage" className="mt-6">
                    <StudentGrid 
                        students={classroom.eleves || []} 
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
