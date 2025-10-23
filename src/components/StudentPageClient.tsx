// src/components/StudentPageClient.tsx - Version avec réception d'invitations
'use client';

import { useState, useEffect, useCallback } from 'react';
import { StudentWithStateAndCareer, AppTask, AnnouncementWithAuthor, Metier, SessionParticipant } from '@/lib/types';
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
import { useActivityTracker } from '@/hooks/useActivityTracker';
import { useSession } from 'next-auth/react';
interface StudentPageClientProps {
    student: StudentWithStateAndCareer;
    announcements: AnnouncementWithAuthor[];
    allCareers: Metier[];
    isTeacherView: boolean;
    tasks: AppTask[];
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
    tasks 
}: StudentPageClientProps) {
    const [activeTab, setActiveTab] = useState('tasks');
    const [sessionInvitation, setSessionInvitation] = useState<SessionInvitation | null>(null);
    const [isJoiningSession, setIsJoiningSession] = useState(false);
    const { toast } = useToast();
    const router = useRouter();
    const { data: session, status } = useSession();

    // Le hook ne doit être actif que si l'utilisateur est authentifié.
    const isActivityTrackerEnabled = status === 'authenticated' && !!session?.user?.id && !!session?.user?.classeId;

    // Active le suivi de présence pour l'élève connecté
    useActivityTracker(session?.user?.id, session?.user?.classeId, isActivityTrackerEnabled);


    const handleAcceptInvitation = useCallback(async (invitation: SessionInvitation) => {
        console.log('✅ [ELEVE] - Acceptation de l\'invitation:', invitation.sessionId);
        setIsJoiningSession(true);
        
        try {
            setSessionInvitation(null);
            toast({
                title: 'Connexion...',
                description: 'Rejoignement de la session vidéo...',
            });
            router.push(`/session/${invitation.sessionId}`);
        } catch (error) {
            console.error('❌ [ELEVE] - Erreur lors de la connexion à la session:', error);
            toast({
                variant: 'destructive',
                title: 'Erreur de connexion',
                description: 'Impossible de rejoindre la session',
            });
            setIsJoiningSession(false);
        }
    }, [router, toast]);

    const handleInvitation = useCallback((data: SessionInvitation) => {
        console.log('📨 [ELEVE] - Nouvelle invitation de session reçue:', data);
        setSessionInvitation(data);
        
        toast({
            title: '🎯 Nouvelle invitation de session !',
            description: `${data.teacherName} vous invite à rejoindre une session vidéo.`,
            duration: 10000,
            action: (
                <div className="flex gap-2">
                    <Button 
                        size="sm" 
                        onClick={() => handleAcceptInvitation(data)}
                    >
                        Rejoindre
                    </Button>
                    <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSessionInvitation(null)}
                    >
                        Ignorer
                    </Button>
                </div>
            ),
        });
    }, [toast, handleAcceptInvitation]);

    useEffect(() => {
        if (isTeacherView || !student?.id) return;
    
        let channel: any;
        
        const checkMissedInvitations = async () => {
            try {
                console.log('🤔 [ELEVE] - Vérification des invitations manquées...');
                const response = await fetch(`/api/session/pending-invitations?studentId=${student.id}`);
                if (response.ok) {
                    const pendingInvitations = await response.json();
                    if (pendingInvitations.length > 0) {
                        const latestInvitation = pendingInvitations[0].data;
                        console.log('📨 [ELEVE] - Invitation manquée trouvée et traitée:', latestInvitation);
                        handleInvitation(latestInvitation);
                    } else {
                         console.log('👍 [ELEVE] - Aucune invitation manquée trouvée.');
                    }
                }
            } catch (error) {
                console.error('❌ [ELEVE] - Erreur lors de la vérification des invitations manquées:', error);
            }
        };
    
        checkMissedInvitations();
    
        const channelName = `private-user-${student.id}`;
        console.log(`📡 [ELEVE] - Abonnement aux invitations sur le canal: ${channelName}`);
    
        try {
            channel = pusherClient.subscribe(channelName);
            channel.bind('session-invitation', handleInvitation);
            channel.bind('pusher:subscription_succeeded', () => {
                console.log(`✅ [ELEVE] - Abonnement réussi au canal ${channelName}`);
            });
             channel.bind('pusher:subscription_error', (status: any) => {
                console.error(`❌ [ELEVE] - Erreur d'abonnement au canal ${channelName}:`, status);
            });
    
            return () => {
                if (channel) {
                    console.log(`🔚 [ELEVE] - Désabonnement du canal ${channelName}`);
                    pusherClient.unsubscribe(channelName);
                }
            };
        } catch (error) {
            console.error('💥 [ELEVE] - Erreur critique d\'abonnement à Pusher:', error);
        }
    }, [student?.id, isTeacherView, handleInvitation]);

    const handleDeclineInvitation = useCallback(() => {
        console.log('🚫 [ELEVE] - Invitation refusée.');
        setSessionInvitation(null);
        toast({
            title: 'Invitation refusée',
            description: 'Vous pouvez rejoindre la session plus tard si elle est encore active.',
        });
    }, [toast]);

    const metier = student.etat?.metier;
    const completedTasks = student.progress?.filter(p => p.status === 'VERIFIED').length || 0;
    const pendingTasks = student.progress?.filter(p => p.status === 'PENDING_VALIDATION').length || 0;
    const totalPoints = student.points || 0;

    return (
        <div className="container mx-auto p-6 space-y-6">
            {sessionInvitation && (
                <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 shadow-lg animate-pulse">
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
                            <AvatarImage src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${student.id}`} alt={student.name || 'Élève'} />
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
                    {/* ... (Task content will go here) ... */}
                </TabsContent>

                <TabsContent value="announcements" className="space-y-4">
                    {announcements.length === 0 ? (
                        <Card>
                            <CardContent className="p-6 text-center">
                                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-semibold">Aucune annonce</h3>
                                <p className="text-muted-foreground">Aucune annonce n'a été publiée.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        announcements.map((announcement) => (
                            <Card key={announcement.id}>
                                <CardHeader>
                                    <CardTitle>{announcement.title}</CardTitle>
                                    <CardDescription>Par {announcement.author.name} le {new Date(announcement.createdAt).toLocaleDateString()}</CardDescription>
                                </CardHeader>
                                <CardContent><p>{announcement.content}</p></CardContent>
                            </Card>
                        ))
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
