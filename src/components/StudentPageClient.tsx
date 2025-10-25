// src/components/StudentPageClient.tsx - Version avec réception d'invitations
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bell, Video, CheckCircle, XCircle, Clock, Trophy, Target, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { pusherClient } from '@/lib/pusher/client';
import { cn } from '@/lib/utils';
import { KeyRound } from 'lucide-react';
import { endCoursSession } from '@/lib/actions';
import { CareerSelector } from '@/components/CareerSelector'; // Assumant que ce composant existe
import { DummySession } from '@/lib/session';
import { TaskBoard } from './TaskBoard';
import { AnnouncementCarousel } from './AnnouncementCarousel';
import type { User as PrismaUser, Metier as PrismaMetier, Announcement as PrismaAnnouncement, StudentProgress as PrismaStudentProgress, Task as PrismaTask, Classroom, EtatEleve } from '@prisma/client';

// Création de types locaux pour la transition
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
    user: DummySession['user'];
}

interface SessionInvitation {
    sessionId: string;
    teacherId: string;
    classroomId: string;
    classroomName: string;
    teacherName: string;
    timestamp: string;
    type: 'session-invitation';
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
    const [sessionInvitation, setSessionInvitation] = useState<SessionInvitation | null>(null);
    const [isJoiningSession, setIsJoiningSession] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const classroomId = student?.classeId;
    console.log('🧑‍🎓 [CLIENT ÉLÈVE] - Initialisation de la page pour:', student.name);

    const handleAcceptInvitation = useCallback(async (invitation: SessionInvitation) => {
        console.log('✅ [CLIENT ÉLÈVE] - Acceptation de l\'invitation de session:', invitation.sessionId);
        setIsJoiningSession(true);
        
        try {
            setSessionInvitation(null);
            toast({
                title: 'Connexion...',
                description: 'Rejoignement de la session vidéo en cours...',
            });
            router.push(`/session/${invitation.sessionId}`);
        } catch (error) {
            console.error('❌ [CLIENT ÉLÈVE] - Erreur lors de la redirection vers la session:', error);
            toast({
                variant: 'destructive',
                title: 'Erreur de connexion',
                description: 'Impossible de rejoindre la session',
            });
            setIsJoiningSession(false);
        }
    }, [router, toast]);

    const handleInvitation = useCallback((data: SessionInvitation) => {
        console.log('📨 [CLIENT ÉLÈVE] - Nouvelle invitation de session reçue via Pusher:', data);
        setSessionInvitation(data);
        
        toast({
            title: '🎯 Invitation de session reçue !',
            description: `Le professeur ${data.teacherName} vous a invité(e).`,
            duration: 10000,
        });
    }, [toast]);

    useEffect(() => {
        if (!student?.id) return;
    
        const checkMissedInvitations = async () => {
            try {
                console.log('📡 [CLIENT ÉLÈVE] - Vérification des invitations manquées...');
                const response = await fetch(`/api/session/pending-invitations?studentId=${student.id}`);
                if (response.ok) {
                    const pendingInvitations = await response.json();
                    if (pendingInvitations.length > 0) {
                        const latestInvitation = pendingInvitations[0].data;
                        console.log('📨 [CLIENT ÉLÈVE] - Invitation manquée trouvée:', latestInvitation);
                        handleInvitation(latestInvitation);
                    } else {
                        console.log('✅ [CLIENT ÉLÈVE] - Aucune invitation manquée.');
                    }
                } else if (response.status !== 404) {
                     // Gérer les erreurs autres que "Not Found"
                    const errorData = await response.json();
                    toast({
                        variant: "destructive",
                        title: "Erreur réseau",
                        description: `Impossible de vérifier les invitations: ${errorData.error || response.statusText}`,
                    });
                }
            } catch (error) {
                console.error('❌ [CLIENT ÉLÈVE] - Erreur lors de la vérification des invitations manquées:', error);
                toast({
                    variant: "destructive",
                    title: "Erreur",
                    description: "Impossible de vérifier les invitations en attente.",
                });
            }
        };
    
        checkMissedInvitations();
    
        // Canal pour les invitations personnelles
        const invitationChannelName = `private-user-${student.id}`;
        console.log(`🔌 [CLIENT ÉLÈVE] - Abonnement au canal d'invitation: ${invitationChannelName}`);
        const invitationChannel = pusherClient.subscribe(invitationChannelName);
        invitationChannel.bind('session-invitation', handleInvitation);

        // Canal pour la présence de la classe
        let presenceChannel: any = null;
        if (classroomId) {
            const presenceChannelName = `presence-class-${classroomId}`;
            console.log(`🔌 [CLIENT ÉLÈVE] - Abonnement au canal de présence: ${presenceChannelName}`);
            presenceChannel = pusherClient.subscribe(presenceChannelName);
            presenceChannel.bind('pusher:subscription_succeeded', () => {
                console.log('✅ [ÉLÈVE] - Présence connectée à la classe');
            });
        }
    
        return () => {
            console.log(`🔌 [CLIENT ÉLÈVE] - Désabonnement des canaux.`);
            pusherClient.unsubscribe(invitationChannelName);
            if (presenceChannel) {
                pusherClient.unsubscribe(presenceChannel.name);
            }
        };
    }, [student?.id, classroomId, handleInvitation, toast]);

    const handleDeclineInvitation = useCallback(() => {
        console.log('🚫 [CLIENT ÉLÈVE] - Invitation refusée.');
        setSessionInvitation(null);
        toast({
            title: 'Invitation refusée',
            description: 'Vous pouvez rejoindre la session plus tard si elle est encore active.',
        });
    }, [toast]);

    const metier = student.etat?.metier;
    const completedTasks = student.studentProgress?.filter(p => p.status === 'VERIFIED').length || 0;
    const totalPoints = student.points || 0;

    return (
        <div className="container mx-auto p-6 space-y-6">
            {sessionInvitation && (
                <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 shadow-lg">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="bg-white/20 p-2 rounded-full">
                                    <Video className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Invitation à une session vidéo</h3>
                                    <p className="text-blue-100">
                                        {sessionInvitation.teacherName} vous invite à rejoindre la classe {sessionInvitation.classroomName}
                                    </p>
                                </div>
                            </div>
                            <div className="flex space-x-2">
                                <Button 
                                    onClick={() => handleAcceptInvitation(sessionInvitation)}
                                    disabled={isJoiningSession}
                                    className="bg-white text-blue-600 hover:bg-blue-50"
                                >
                                    {isJoiningSession ? <Clock className="h-4 w-4 animate-spin mr-2" /> : <Video className="h-4 w-4 mr-2" />}
                                    Rejoindre
                                </Button>
                                <Button 
                                    onClick={handleDeclineInvitation}
                                    variant="outline" 
                                    className="border-white text-white hover:bg-white/20"
                                >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Ignorer
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={student.image ?? `https://api.dicebear.com/7.x/pixel-art/svg?seed=${student.id}`} alt={student.name || 'Élève'} />
                            <AvatarFallback>{student.name?.charAt(0)?.toUpperCase() || 'E'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold">{student.name}</h1>
                            <p className="text-muted-foreground">{student.email}</p>
                            <div className="flex items-center space-x-4 mt-2">
                                <div className="flex items-center space-x-1"><Trophy className="h-4 w-4 text-yellow-500" /><span>{totalPoints} points</span></div>
                                <div className="flex items-center space-x-1"><CheckCircle className="h-4 w-4 text-green-500" /><span>{completedTasks} tâches</span></div>
                            </div>
                        </div>
                        {student.classe && !isTeacherView && (
                             <Button asChild variant="outline">
                                <a href={`/student/class/${student.classe.id}`}><Users className="mr-2 h-4 w-4"/> Ma Classe</a>
                            </Button>
                        )}
                        {!isTeacherView && (
                             <Button asChild variant="outline">
                                <a href={`/student/${student.id}/parent`}><KeyRound className="mr-2 h-4 w-4"/> Espace Parent</a>
                            </Button>
                        )}
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
                                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-semibold">Aucune annonce</h3>
                                <p className="text-muted-foreground">Aucune annonce n'a été publiée pour le moment.</p>
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
