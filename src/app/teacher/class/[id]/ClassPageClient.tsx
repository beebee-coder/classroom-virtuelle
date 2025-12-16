// src/app/teacher/class/[id]/ClassPageClient.tsx
'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { CreateAnnouncementForm } from '@/components/CreateAnnouncementForm';
import { AddStudentForm } from './AddStudentForm';
import { BackButton } from '@/components/BackButton';
import { AnnouncementCarousel } from '@/components/AnnouncementCarousel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Video, UserCheck } from 'lucide-react';
import { SessionLauncher } from './SessionLauncher';
import { StudentGrid } from './StudentGrid';
import { type User, type Announcement, Role, ValidationStatus } from '@prisma/client';
import type { ClassroomWithDetails } from '@/types';
import { useAblyPresence } from '@/hooks/useAblyPresence';
import { validateStudent } from '@/lib/actions/teacher.actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useAbly } from '@/hooks/useAbly';
import { AblyEvents } from '@/lib/ably/events';
import { getPendingStudentsChannelName } from '@/lib/ably/channels';

type AnnouncementWithAuthor = Announcement & { author: { name: string | null } };

interface ClassPageClientProps {
    classroom: ClassroomWithDetails;
    teacher: User;
    announcements: AnnouncementWithAuthor[];
}

export default function ClassPageClient({ classroom, teacher, announcements }: ClassPageClientProps) {
    const [hasEnteredPresence, setHasEnteredPresence] = useState(false);
    const [presenceEnterAttempts, setPresenceEnterAttempts] = useState(0);
    const { toast } = useToast();
    const [isPendingValidation, startValidationTransition] = useTransition();
    
    // ✅ CORRECTION: L'état local est initialisé avec TOUS les élèves (validés ET en attente)
    const [allStudents, setAllStudents] = useState<User[]>(classroom.eleves || []);

    const pendingStudents = useMemo(() => 
        allStudents.filter(s => s.validationStatus === ValidationStatus.PENDING),
        [allStudents]
    );

    const validatedStudents = useMemo(() =>
        allStudents.filter(s => s.validationStatus === ValidationStatus.VALIDATED),
        [allStudents]
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

    const ablyClient = useAbly('ClassPageClient-GlobalListener');
    useEffect(() => {
        if (!ablyClient) return;

        const channelName = getPendingStudentsChannelName();
        console.log(`🎧 [CLIENT CLASSE] - Écoute des nouveaux élèves sur le canal global: ${channelName}`);
        const channel = ablyClient.client.channels.get(channelName);

        const listener = (message: any) => {
            console.log("📨 [CLIENT CLASSE] - Événement 'student-pending' reçu!", message.data);
            const data = message.data;
            const newStudent: User = {
                id: data.studentId,
                name: data.studentName,
                email: data.studentEmail,
                emailVerified: null,
                image: null,
                password: null,
                parentPassword: null,
                role: 'ELEVE',
                validationStatus: 'PENDING',
                points: 0,
                ambition: null,
                classeId: null, // Un nouvel élève n'a pas encore de classe
            };

            setAllStudents(prev => {
                if (prev.some(s => s.id === newStudent.id)) return prev;
                toast({
                    title: "🔔 Nouvel élève en attente !",
                    description: `${newStudent.name} vient de s'inscrire et attend votre validation.`
                });
                console.log(`  -> ✨ Ajout de ${newStudent.name} à la liste d'attente.`);
                return [...prev, newStudent];
            });
        };

        channel.subscribe(AblyEvents.STUDENT_PENDING, listener);

        return () => {
            console.log(`🛑 [CLIENT CLASSE] - Arrêt de l'écoute sur ${channelName}`);
            channel.unsubscribe(AblyEvents.STUDENT_PENDING, listener);
            channel.detach();
        };
    }, [ablyClient, toast]);

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
                    setPresenceEnterAttempts(0);
                } catch (error) {
                    setPresenceEnterAttempts(prev => prev + 1);
                    if (presenceEnterAttempts < 3) {
                        setTimeout(() => setHasEnteredPresence(false), Math.min(1000 * Math.pow(2, presenceEnterAttempts), 10000));
                    }
                }
            };
            enterPresenceWithRetry();
        }
    }, [isConnected, classroom?.id, teacher, enterPresence, isLoading, hasEnteredPresence, presenceEnterAttempts]);

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

    const handleValidateStudent = (student: User) => {
        console.log(`▶️ [CLIENT CLASSE] - Le professeur clique sur 'Valider' pour l'élève ${student.id}`);
        startValidationTransition(async () => {
            try {
                const validated = await validateStudent(student.id, classroom.id);
                toast({ title: 'Élève validé !', description: `${validated.name} a été ajouté à votre classe.` });
                
                // Mettre à jour l'état local pour une UI réactive
                setAllStudents(prev => prev.map(s => s.id === validated.id ? validated : s));

            } catch (error) {
                toast({ variant: 'destructive', title: 'Erreur de validation', description: 'Impossible de valider cet élève.' });
            }
        });
    };

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
            
            <Tabs defaultValue="manage" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="manage">
                        <Users className="mr-2 h-4 w-4" />
                        Élèves ({validatedStudents.length})
                    </TabsTrigger>
                    <TabsTrigger value="pending">
                        <UserCheck className="mr-2 h-4 w-4" />
                        En attente ({pendingStudents.length})
                    </TabsTrigger>
                    <TabsTrigger value="launch">
                        <Video className="mr-2 h-4 w-4" />
                        Lancer une Session
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="manage" className="mt-6">
                    <StudentGrid 
                        students={validatedStudents} 
                        onlineStudentIds={onlineStudentIds}
                    />
                </TabsContent>
                <TabsContent value="pending" className="mt-6">
                    {pendingStudents.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Aucun élève en attente de validation.</p>
                    ) : (
                        <div className="space-y-3">
                            {pendingStudents.map(student => (
                                <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                                    <div>
                                        <p className="font-medium">{student.name}</p>
                                        <p className="text-sm text-muted-foreground">{student.email}</p>
                                    </div>
                                    <Button onClick={() => handleValidateStudent(student)} disabled={isPendingValidation}>
                                        {isPendingValidation ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <UserCheck className="mr-2 h-4 w-4"/>}
                                        Valider et ajouter à cette classe
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
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
