
// src/app/teacher/class/[id]/ClassPageClient.tsx - Version avec simulation de présence
'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { createCoursSession } from '@/lib/actions/session.actions';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { CreateAnnouncementForm } from '@/components/CreateAnnouncementForm';
import { AddStudentForm } from './AddStudentForm';
import { ClassroomWithDetails, StudentForCard, AnnouncementWithAuthor } from '@/lib/types';
import { User } from 'next-auth';
import { AnnouncementCarousel } from '@/components/AnnouncementCarousel';
import { BackButton } from '@/components/BackButton';
import { Video, XSquare, Crown, Loader2, Wifi, WifiOff } from 'lucide-react';
import { pusherClient } from '@/lib/pusher/client';
import type { PresenceChannel } from 'pusher-js';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';

interface ClassPageClientProps {
    classroom: ClassroomWithDetails;
    teacher: User;
    announcements: AnnouncementWithAuthor[];
}

// ID de l'élève de démo connecté
const SIMULATED_ONLINE_STUDENT_ID = 'student1';

export default function ClassPageClient({ classroom, teacher, announcements }: ClassPageClientProps) {
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [isStartingSession, setIsStartingSession] = useState<boolean>(false);
    const [onlineStudents, setOnlineStudents] = useState<string[]>([]);
    const [isSimulationMode, setIsSimulationMode] = useState<boolean>(true);
    const router = useRouter();
    const { toast } = useToast();
    const { data: session } = useSession();

    // Simulation de présence pour le développement
    useEffect(() => {
        if (isSimulationMode) {
            console.log('🎮 [PRESENCE SIMULATION] - Seul l\'élève connecté (ID: student1) est affiché comme en ligne.');
            setOnlineStudents([SIMULATED_ONLINE_STUDENT_ID]);
        }
    }, [isSimulationMode]);

    // Abonnement réel Pusher (désactivé en simulation)
    useEffect(() => {
        if (!isSimulationMode && classroom.id && session?.user?.id) {
            console.log("👨‍🏫 [PRESENCE PROF] - Abonnement réel Pusher activé", { classroomId: classroom.id, userId: session.user.id });

            const channelName = `presence-class-${classroom.id}`;
            console.log(`👨‍🏫 [PRESENCE PROF] - Tentative d'abonnement au canal: ${channelName}`);
            
            try {
                const channel = pusherClient.subscribe(channelName) as PresenceChannel;

                const updateOnlineMembers = () => {
                    if (channel.members?.members) {
                        const memberIds = Object.keys(channel.members.members);
                        console.log('👨‍🏫 [PRESENCE PROF] - Mise à jour des membres. IDs reçus de Pusher:', memberIds);
                        const studentMemberIds = memberIds.filter(id => id !== session.user?.id);
                        setOnlineStudents(studentMemberIds);
                        console.log('👨‍🏫 [PRESENCE PROF] - Liste des élèves en ligne mise à jour:', studentMemberIds);
                    }
                };

                channel.bind('pusher:subscription_succeeded', (members: any) => {
                    console.log('✅ [PRESENCE PROF] - Abonnement réussi. Membres actuels:', members.members);
                    updateOnlineMembers();
                });
                
                channel.bind('pusher:member_added', (member: { id: string, info: any }) => {
                    console.log('➕ [PRESENCE PROF] - Membre ajouté:', member);
                    updateOnlineMembers();
                });
                
                channel.bind('pusher:member_removed', (member: { id: string, info: any }) => {
                    console.log('➖ [PRESENCE PROF] - Membre retiré:', member);
                    updateOnlineMembers();
                });

                return () => {
                    console.log(`🔚 [PRESENCE PROF] - Désabonnement du canal ${channelName}`);
                    pusherClient.unsubscribe(channelName);
                };
            } catch (error) {
                console.error("❌ [PRESENCE PROF] - Erreur lors de l'abonnement Pusher:", error);
                // Retour à la simulation en cas d'erreur
                setIsSimulationMode(true);
                toast({
                    variant: 'destructive',
                    title: 'Erreur de présence',
                    description: 'Mode simulation activé',
                });
            }
        }
    }, [classroom.id, session?.user?.id, isSimulationMode, toast]);

    // Validation des props
    if (!classroom?.id || !teacher?.id) {
        console.error('❌ [CLIENT] - Props manquants:', { classroom, teacher });
        toast({
            variant: 'destructive',
            title: 'Erreur de chargement',
            description: 'Données de classe ou professeur manquantes.',
        });
        return null;
    }

    const handleSelectStudent = useCallback((studentId: string) => {
        if (!studentId) {
            console.warn('⚠️ [CLIENT] - ID d\'élève invalide');
            return;
        }
        setSelectedStudents(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
    }, []);

    const handleStartSession = async () => {
        console.log('🚀 [CLIENT] - Clic sur "Démarrer la session". Élèves sélectionnés:', selectedStudents);
        
        const onlineSelectedStudents = selectedStudents.filter(id => onlineStudents.includes(id));
        
        // Validation des sélections
        if (onlineSelectedStudents.length === 0) {
            toast({
                variant: 'destructive',
                title: 'Aucun élève sélectionné en ligne',
                description: 'Veuillez sélectionner au moins un élève actuellement en ligne pour démarrer la session.',
            });
            return;
        }

        // Validation du professeur
        if (!teacher.id) {
            toast({
                variant: 'destructive',
                title: 'Erreur d\'authentification',
                description: 'Identifiant professeur manquant.',
            });
            return;
        }

        setIsStartingSession(true);

        try {
            console.log('⏳ [CLIENT] - Appel de l\'action serveur `createCoursSession`...');
            const session = await createCoursSession(teacher.id, onlineSelectedStudents);
            
            if (!session?.id) {
                throw new Error('Réponse de session invalide');
            }

            console.log('✅ [CLIENT] - Action serveur réussie. Session créée:', session);

            toast({
                title: 'Session créée !',
                description: `Session vidéo lancée avec ${onlineSelectedStudents.length} élève(s).`,
                duration: 3000,
            });

            // Redirection vers la session
            console.log(`🔀 [CLIENT] - Redirection vers /session/${session.id}`);
            router.push(`/session/${session.id}`);

        } catch (error: unknown) {
            console.error('❌ [CLIENT] - Erreur lors de la création de la session:', error);
            
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
                    <CreateAnnouncementForm classrooms={[classroom]} />
                    <AddStudentForm classroomId={classroom.id} />
                    
                    {/* Bouton de contrôle de simulation */}
                    <Button
                        variant={isSimulationMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIsSimulationMode(!isSimulationMode)}
                        className="gap-2"
                    >
                        {isSimulationMode ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                        {isSimulationMode ? 'Simulation' : 'Réel'}
                    </Button>
                </div>
            </div>
            
            {/* Indicateur de mode */}
            {isSimulationMode && (
                <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-800">
                        <Wifi className="h-4 w-4" />
                        <span className="font-medium">Mode simulation activé</span>
                        <span className="text-sm">- Présence des élèves simulée pour le développement</span>
                    </div>
                </div>
            )}
            
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
                        disabled={onlineSelectedCount === 0 || isStartingSession}
                        className="min-w-[180px]"
                    >
                        {isStartingSession ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Création...
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
