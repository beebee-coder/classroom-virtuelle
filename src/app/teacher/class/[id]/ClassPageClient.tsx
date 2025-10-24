// src/app/teacher/class/[id]/ClassPageClient.tsx - Version avec invitations
'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { createCoursSession } from '@/lib/actions/session.actions';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { CreateAnnouncementForm } from '@/components/CreateAnnouncementForm';
import { AddStudentForm } from './AddStudentForm';
import { ClassroomWithDetails, StudentForCard, AnnouncementWithAuthor, User } from '@/lib/types';
import { AnnouncementCarousel } from '@/components/AnnouncementCarousel';
import { BackButton } from '@/components/BackButton';
import { Video, XSquare, Crown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePresenceForTeacher } from '@/hooks/usePresenceForTeacher';


interface ClassPageClientProps {
    classroom: ClassroomWithDetails;
    teacher: User;
    announcements: AnnouncementWithAuthor[];
}

export default function ClassPageClient({ classroom, teacher, announcements }: ClassPageClientProps) {
    console.log(`👨‍🏫 [CLIENT CLASSE] - Initialisation pour la classe "${classroom.nom}"`);
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [isStartingSession, setIsStartingSession] = useState<boolean>(false);
    const [isSendingInvitations, setIsSendingInvitations] = useState<boolean>(false);
    const router = useRouter();
    const { toast } = useToast();

    // Utilisation du nouveau hook pour gérer la présence
    const { onlineUsers: onlineStudents, isConnected, error: presenceError } = usePresenceForTeacher(teacher.id, classroom.id);
    console.log('  Utilisateurs en ligne détectés:', onlineStudents);

    // Afficher une erreur si la connexion de présence échoue
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
                description: `Session vidéo lancée avec ${successful.length} élève(s). ${failed.length > 0 ? `${failed.length} échec(s) d'envoi.` : ''}`,
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

    // Tri sécurisé des élèves
    const sortedStudents = [...(classroom.eleves || [])].sort((a, b) => {
        const pointsA = a.points ?? 0;
        const pointsB = b.points ?? 0;
        return pointsB - pointsA;
    });

    // Fonction pour générer l'avatar de façon sécurisée
    const getStudentAvatarUrl = (student: StudentForCard): string => {
        return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${student.id || 'default'}`;
    };

    const getStudentInitial = (student: StudentForCard): string => {
        return student.name?.charAt(0)?.toUpperCase() || '?';
    };

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
                        Sélectionnez les élèves <span className="font-bold text-green-600">en ligne</span> (indicateur vert) pour démarrer une session vidéo.
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {sortedStudents.map((student, index) => {
                                const isOnline = onlineStudents.includes(student.id);
                                const isSelected = selectedStudents.includes(student.id);
                                
                                return (
                                    <Card 
                                        key={student.id} 
                                        className={cn(`transition-all duration-200`,
                                            isSelected 
                                                ? 'ring-2 ring-primary shadow-md' 
                                                : 'hover:shadow-sm',
                                            !isOnline && 'opacity-60 bg-muted/50'
                                        )}
                                    >
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className="text-sm font-medium truncate max-w-[120px]">
                                                {student.name || 'Élève sans nom'}
                                            </CardTitle>
                                            <div className="flex items-center gap-2">
                                                {isOnline ? (
                                                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" title="En ligne" />
                                                ) : (
                                                    <div className="h-2 w-2 rounded-full bg-gray-400" title="Hors ligne" />
                                                )}
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => handleSelectStudent(student.id)}
                                                    disabled={isStartingSession || !isOnline}
                                                    aria-label={`Sélectionner ${student.name}`}
                                                />
                                            </div>
                                        </CardHeader>
                                        <CardContent className="text-center">
                                            <div className="relative inline-block">
                                                <Avatar 
                                                    className="h-20 w-20 cursor-pointer" 
                                                    onClick={() => router.push(`/student/${student.id}?viewAs=teacher`)}
                                                >
                                                    <AvatarImage 
                                                        src={getStudentAvatarUrl(student)} 
                                                        alt={`Avatar de ${student.name}`}
                                                    />
                                                    <AvatarFallback>
                                                        {getStudentInitial(student)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                {index === 0 && sortedStudents.length > 1 && (
                                                    <Crown className="absolute -top-2 -right-2 h-6 w-6 text-yellow-400 transform rotate-12" />
                                                )}
                                                {student.etat?.isPunished && (
                                                    <div className="absolute -bottom-1 -right-1 bg-destructive rounded-full p-1">
                                                        <XSquare className="h-4 w-4 text-destructive-foreground" />
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-2 truncate">
                                                {student.email || 'Aucun email'}
                                            </p>
                                            <p className="text-xl font-bold mt-1">
                                                {student.points ?? 0} pts
                                            </p>
                                            <div className="mt-1 text-xs">
                                                {isOnline ? (
                                                    <span className="text-green-600 font-medium">● En ligne</span>
                                                ) : (
                                                    <span className="text-gray-500">● Hors ligne</span>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
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
