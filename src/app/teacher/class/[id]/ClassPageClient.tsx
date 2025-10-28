// src/app/teacher/class/[id]/ClassPageClient.tsx
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { createCoursSession } from '@/lib/actions/session.actions';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { CreateAnnouncementForm } from '@/components/CreateAnnouncementForm';
import { AddStudentForm } from './AddStudentForm';
import { BackButton } from '@/components/BackButton';
import { Video, Loader2 } from 'lucide-react';
import { usePresenceForTeacher } from '@/hooks/usePresenceForTeacher';
import { AnnouncementCarousel } from '@/components/AnnouncementCarousel';
import { StudentCard } from '@/components/StudentCard'; // Import du nouveau composant
import type { User, Classroom, Announcement, EtatEleve } from '@prisma/client';

type AnnouncementWithAuthor = Announcement & { author: { name: string | null } };
type StudentForCard = User & { etat: { isPunished: boolean } | null };
type ClassroomWithStudentsAndPunishment = Classroom & {
    eleves: (User & {
        etat: { isPunished: boolean, metierId?: string | null } | null;
    })[];
};

interface ClassPageClientProps {
    classroom: ClassroomWithStudentsAndPunishment;
    teacher: User;
    announcements: AnnouncementWithAuthor[];
}

export default function ClassPageClient({ classroom, teacher, announcements }: ClassPageClientProps) {
    const hasLoggedRef = useRef(false);
    useEffect(() => {
        if (!hasLoggedRef.current) {
          console.log(`👨‍🏫 [CLIENT CLASSE] - Initialisation pour la classe "${classroom.nom}"`);
          hasLoggedRef.current = true;
        }
      }, [classroom.nom]);
    
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [isStartingSession, setIsStartingSession] = useState<boolean>(false);
    const [isSendingInvitations, setIsSendingInvitations] = useState<boolean>(false);
    const router = useRouter();
    const { toast } = useToast();

    const { onlineUsers: onlineStudents, isConnected, error: presenceError } = usePresenceForTeacher(
        teacher?.id, 
        classroom?.id,
        !!teacher?.id && !!classroom?.id
    );

    useEffect(() => {
        console.log('👨‍🏫 [PRESENCE PROF] - Statut:', { 
          onlineUsers: onlineStudents, 
          isConnected, 
          error: presenceError,
          userId: teacher.id,
          classroomId: classroom.id 
        });
      }, [onlineStudents, isConnected, presenceError, teacher.id, classroom.id]);


    if (presenceError) {
        console.error('❌ [CLIENT CLASSE] - Erreur de connexion temps réel:', presenceError);
        toast({
            variant: 'destructive',
            title: 'Erreur de connexion temps réel',
            description: 'Impossible de suivre la présence des élèves.',
        });
    }

    const handleSelectStudent = useCallback((studentId: string) => {
        if (!studentId) {
            console.warn('⚠️ [CLIENT CLASSE] - Tentative de sélection d\'un élève avec ID invalide');
            return;
        }
        setSelectedStudents(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
        console.log(`  Élève ${studentId} sélectionné/désélectionné.`);
    }, []);

    const handleStartSession = async () => {
        console.log('🚀 [CLIENT CLASSE] - Clic sur "Démarrer la session".');
        
        const onlineSelectedStudents = selectedStudents.filter(id => onlineStudents.includes(id));
        console.log('🎯 [CLIENT CLASSE] - Élèves en ligne sélectionnés pour l\'invitation:', onlineSelectedStudents);
        
        if (onlineSelectedStudents.length === 0) {
            toast({
                variant: 'destructive',
                title: 'Aucun élève sélectionné en ligne',
                description: 'Veuillez sélectionner au moins un élève actuellement en ligne pour démarrer la session.',
            });
            return;
        }

        if (!teacher.id) {
             console.error('❌ [CLIENT CLASSE] - ID du professeur manquant.');
            toast({
                variant: 'destructive',
                title: 'Erreur d\'authentification',
                description: 'Identifiant professeur manquant.',
            });
            return;
        }

        setIsStartingSession(true);
        setIsSendingInvitations(true);

        try {
            console.log('⏳ [CLIENT CLASSE] - Appel de l\'action serveur `createCoursSession`...');
            const session = await createCoursSession(teacher.id, classroom.id, onlineSelectedStudents);
            
            if (!session?.id) {
                throw new Error('Réponse de session invalide de l\'action serveur');
            }

            console.log('✅ [CLIENT CLASSE] - Action serveur réussie. Session créée:', session);

           if (session.invitationResults) {
            const { successful, failed } = session.invitationResults;
            console.log(`  Résultats des invitations: ${successful.length} succès, ${failed.length} échecs.`);
            toast({
                title: 'Session créée et invitations envoyées !',
                description: `Session vidéo lancée avec ${successful.length} élève(s). ${failed.length > 0 ? `${failed.length > 0 ? failed.length : ''} échec(s) d'envoi.` : ''}`,
                duration: 5000,
            });
        }

        console.log(`🔀 [CLIENT CLASSE] - Redirection vers /session/${session.id}`);
        router.push(`/session/${session.id}`);

    } catch (error: unknown) {
        console.error('💥 [CLIENT CLASSE] - Erreur lors de la création de la session:', error);
        
        const errorMessage = error instanceof Error 
            ? error.message 
            : 'Une erreur inconnue est survenue';

        toast({
            variant: 'destructive',
            title: 'Erreur de création de session',
            description: errorMessage,
            duration: 5000,
        });
    } finally {
        setIsStartingSession(false);
        setIsSendingInvitations(false);
    }
};

    const sortedStudents = [...(classroom.eleves || [])].sort((a, b) => {
        const pointsA = a.points ?? 0;
        const pointsB = b.points ?? 0;
        return pointsB - pointsA;
    });

    const onlineSelectedCount = selectedStudents.filter(id => onlineStudents.includes(id)).length;

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
            
            <Card>
                <CardHeader>
                    <CardTitle>
                        Liste des Élèves ({classroom.eleves?.length || 0})
                        <span className="ml-2 text-sm font-normal text-green-600">
                            • {onlineStudents.length} en ligne
                        </span>
                    </CardTitle>
                    <CardDescription>
                        Sélectionnez les élèves <span className="font-bold text-green-600">en ligne</span> pour démarrer une session vidéo.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!classroom.eleves || classroom.eleves.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground">
                                Aucun élève dans cette classe pour le moment.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                           {sortedStudents.map((student, index) => (
                                <StudentCard
                                    key={student.id}
                                    student={student}
                                    isOnline={onlineStudents.includes(student.id)}
                                    isSelected={selectedStudents.includes(student.id)}
                                    isTopStudent={index === 0 && sortedStudents.length > 1}
                                    isPunished={student.etat?.isPunished ?? false}
                                    onSelect={() => handleSelectStudent(student.id)}
                                    isSelectionDisabled={isStartingSession}
                                />
                           ))}
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                        {onlineSelectedCount > 0 
                            ? `${onlineSelectedCount} élève(s) en ligne sélectionné(s)` 
                            : 'Sélectionnez au moins un élève en ligne'
                        }
                    </div>
                    <Button 
                        onClick={handleStartSession} 
                        disabled={onlineSelectedCount === 0 || isStartingSession || isSendingInvitations}
                        className="min-w-[180px]"
                    >
                        {isStartingSession || isSendingInvitations ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {isSendingInvitations ? 'Envoi des invitations...' : 'Création...'}
                            </>
                        ) : (
                            <>
                                <Video className="mr-2 h-4 w-4" />
                                Démarrer la session ({onlineSelectedCount})
                            </>
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </main>
    );
}
