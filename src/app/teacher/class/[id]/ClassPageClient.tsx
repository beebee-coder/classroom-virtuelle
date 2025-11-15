// src/app/teacher/class/[id]/ClassPageClient.tsx - VERSION CORRIGÉE
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
    
    const { 
        onlineMembers, 
        isConnected, 
        error: presenceError,
        enterPresence,
        isLoading 
    } = useAblyPresence(
        classroom?.id,
        !!classroom?.id
    );

    // CORRECTION: Entrer dans la présence UNE SEULE FOIS quand le canal est connecté et prêt
    useEffect(() => {
        if (isConnected && classroom?.id && teacher && !hasEnteredPresence && !isLoading) {
            console.log('👨‍🏫 [CLASSE] - Professeur entre dans la présence');
            
            const enterPresenceWithRetry = async () => {
                try {
                    await enterPresence({
                        name: teacher.name || 'Professeur',
                        role: Role.PROFESSEUR,
                        image: teacher.image,
                    });
                    setHasEnteredPresence(true);
                } catch (error) {
                    console.error('❌ [CLASSE] - Erreur lors de l\'entrée en présence:', error);
                    // Réessayer après un délai
                    setTimeout(() => {
                        setHasEnteredPresence(false);
                    }, 2000);
                }
            };

            enterPresenceWithRetry();
        }
    }, [isConnected, classroom?.id, teacher, enterPresence, isLoading, hasEnteredPresence]);

    // CORRECTION: Mapper les clientId Ably vers les userId de la base de données
    const onlineStudentIds = useMemo(() => {
        console.log('🔍 [CLASSE] - Online members from Ably:', onlineMembers);
        
        // CORRECTION: Créer un mapping basé sur les noms/emails pour lier les clientId aux userId
        const onlineIds: string[] = [];
        
        onlineMembers.forEach(member => {
            // Si c'est un élève (pas le professeur)
            if (member.role === Role.ELEVE) {
                // CORRECTION: Trouver l'élève correspondant dans la classe par nom/email
                const matchingStudent = classroom.eleves?.find(student => 
                    student.name === member.name || 
                    student.email?.includes(member.name?.toLowerCase() || '')
                );
                
                if (matchingStudent) {
                    console.log(`✅ [CLASSE] - Mapped Ably client ${member.id} to student ${matchingStudent.id} (${matchingStudent.name})`);
                    onlineIds.push(matchingStudent.id);
                } else {
                    console.warn(`⚠️ [CLASSE] - No matching student found for Ably member:`, member);
                }
            }
        });
        
        console.log(`📊 [CLASSE] - Online student IDs:`, onlineIds);
        return onlineIds;
    }, [onlineMembers, classroom.eleves]);

    if (presenceError) {
        console.error('❌ [CLIENT CLASSE] - Erreur de connexion temps réel Ably:', presenceError);
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
                            {isConnected ? (
                                <span className="ml-2 text-green-600">
                                    ● En ligne ({onlineMembers.length} membres, {onlineStudentIds.length} élèves)
                                </span>
                            ) : (
                                <span className="ml-2 text-yellow-600">
                                    ⚡ Connexion en cours...
                                </span>
                            )}
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