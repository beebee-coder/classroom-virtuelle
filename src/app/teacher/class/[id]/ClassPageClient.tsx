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

    // ✅ CORRECTION : Entrer dans la présence avec gestion robuste des erreurs
    useEffect(() => {
        if (isConnected && classroom?.id && teacher && !hasEnteredPresence && !isLoading) {
            console.log('👨‍🏫 [CLASSE] - Professeur entre dans la présence');
            
            const enterPresenceWithRetry = async () => {
                try {
                    await enterPresence({
                        name: teacher.name || 'Professeur',
                        role: Role.PROFESSEUR,
                        image: teacher.image,
                        data: {
                            userId: teacher.id,
                            role: Role.PROFESSEUR, // ✅ CORRECTION : Ajout du rôle dans data
                            classroomId: classroom.id
                        }
                    });
                    console.log('✅ [CLASSE] - Professeur entré avec succès dans la présence');
                    setHasEnteredPresence(true);
                    setPresenceEnterAttempts(0); // Réinitialiser les tentatives en cas de succès
                } catch (error) {
                    console.error('❌ [CLASSE] - Erreur lors de l\'entrée en présence:', error);
                    setPresenceEnterAttempts(prev => prev + 1);
                    
                    // ✅ CORRECTION : Stratégie de réessai intelligente
                    if (presenceEnterAttempts < 3) {
                        const retryDelay = Math.min(1000 * Math.pow(2, presenceEnterAttempts), 10000); // Exponential backoff
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

    // ✅ CORRECTION : Logique de mapping améliorée avec gestion des professeurs
    const { onlineStudentIds, onlineTeacherIds } = useMemo(() => {
        console.log('🔍 [CLASSE] - Online members from Ably:', onlineMembers);
        
        const onlineStudentIds: string[] = [];
        const onlineTeacherIds: string[] = [];
        
        onlineMembers.forEach(member => {
            // ✅ CORRECTION : Vérification plus robuste du rôle et de l'identité
            const memberRole = member.data?.role || member.role;
            const memberUserId = member.data?.userId || member.id;

            if (memberRole === Role.PROFESSEUR) {
                // Gestion des professeurs
                if (memberUserId === teacher.id) {
                    console.log(`👨‍🏫 [CLASSE] - Professeur connecté: ${teacher.name}`);
                    onlineTeacherIds.push(memberUserId);
                } else {
                    console.log(`👨‍🏫 [CLASSE] - Autre professeur connecté: ${member.name} (${memberUserId})`);
                    onlineTeacherIds.push(memberUserId);
                }
            } else if (memberRole === Role.ELEVE) {
                // ✅ CORRECTION : Mapping des élèves avec plusieurs stratégies
                let studentFound = false;

                // Stratégie 1: Recherche par userId exact
                if (memberUserId) {
                    const student = classroom.eleves?.find(s => s.id === memberUserId);
                    if (student) {
                        console.log(`✅ [CLASSE] - Mapped Ably member ${member.id} to student ${memberUserId} (${student.name}) via userId`);
                        onlineStudentIds.push(memberUserId);
                        studentFound = true;
                    }
                }

                // Stratégie 2: Recherche par nom (fallback)
                if (!studentFound && member.name) {
                    const matchingStudent = classroom.eleves?.find(student => {
                        // Comparaison flexible des noms
                        const studentName = student.name?.toLowerCase().trim();
                        const memberName = member.name?.toLowerCase().trim();
                        
                        return studentName === memberName || 
                               (studentName && memberName && (
                                   studentName.includes(memberName) || 
                                   memberName.includes(studentName) ||
                                   student.name?.toLowerCase().includes(member.name?.toLowerCase() || '')
                               ));
                    });
                    
                    if (matchingStudent) {
                        console.log(`✅ [CLASSE] - Mapped Ably member ${member.id} to student ${matchingStudent.id} (${matchingStudent.name}) via name matching`);
                        onlineStudentIds.push(matchingStudent.id);
                        studentFound = true;
                    }
                }

                // Stratégie 3: Recherche par email (fallback supplémentaire)
                if (!studentFound && member.data?.email) {
                    const matchingStudent = classroom.eleves?.find(student => 
                        student.email?.toLowerCase() === member.data?.email?.toLowerCase()
                    );
                    
                    if (matchingStudent) {
                        console.log(`✅ [CLASSE] - Mapped Ably member ${member.id} to student ${matchingStudent.id} (${matchingStudent.name}) via email`);
                        onlineStudentIds.push(matchingStudent.id);
                        studentFound = true;
                    }
                }

                if (!studentFound) {
                    console.warn(`⚠️ [CLASSE] - No matching student found for Ably member:`, {
                        memberId: member.id,
                        memberName: member.name,
                        memberRole: memberRole,
                        memberUserId: memberUserId,
                        availableStudents: classroom.eleves?.map(s => ({ id: s.id, name: s.name }))
                    });
                }
            } else {
                console.warn(`⚠️ [CLASSE] - Membre avec rôle inconnu:`, member);
            }
        });
        
        // ✅ CORRECTION : Déduplication des IDs (au cas où)
        const uniqueStudentIds = [...new Set(onlineStudentIds)];
        const uniqueTeacherIds = [...new Set(onlineTeacherIds)];
        
        console.log(`📊 [CLASSE] - Online student IDs:`, uniqueStudentIds);
        console.log(`👨‍🏫 [CLASSE] - Online teacher IDs:`, uniqueTeacherIds);
        
        return {
            onlineStudentIds: uniqueStudentIds,
            onlineTeacherIds: uniqueTeacherIds
        };
    }, [onlineMembers, classroom.eleves, teacher.id]);

    // ✅ CORRECTION : Calcul des statistiques de présence amélioré
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
            // ✅ NOUVEAU : Pourcentage de présence
            onlinePercentage: totalStudents > 0 ? Math.round((onlineStudents / totalStudents) * 100) : 0
        };
    }, [onlineMembers, onlineStudentIds, onlineTeacherIds, classroom.eleves]);

    // ✅ CORRECTION : Gestion améliorée des erreurs de présence
    useEffect(() => {
        if (presenceError) {
            console.error('❌ [CLIENT CLASSE] - Erreur de connexion temps réel Ably:', presenceError);
            
            // Tentative de récupération automatique
            if (presenceError?.includes('disconnected') || presenceError?.includes('timeout')) {
                console.log('🔄 [CLIENT CLASSE] - Tentative de récupération de la connexion...');
                // La reconnexion sera gérée automatiquement par useAblyPresence
            }
        }
    }, [presenceError]);

    // ✅ CORRECTION : Statut de connexion détaillé
    const getConnectionStatus = () => {
        if (isLoading) return { text: '⚡ Connexion en cours...', color: 'text-yellow-600' };
        if (!isConnected) return { text: '🔌 Déconnecté', color: 'text-red-600' };
        if (presenceError) return { text: '⚠️ Connexion instable', color: 'text-orange-600' };
        
        return { 
            text: `● En ligne (${presenceStats.totalOnline} membres, ${presenceStats.onlineStudents}/${presenceStats.totalStudents} élèves, ${presenceStats.teachersOnline} prof${presenceStats.teachersOnline > 1 ? 's' : ''})`,
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
                            {presenceStats.onlinePercentage > 0 && (
                                <span className="ml-2 text-blue-600">
                                    {presenceStats.onlinePercentage}% de présence
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
