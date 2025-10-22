// src/components/StudentPageClient.tsx - Version avec réception d'invitations
'use client';

import { useState, useEffect, useCallback } from 'react';
import { StudentWithStateAndCareer, AppTask, AnnouncementWithAuthor, Metier } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bell, Video, CheckCircle, XCircle, Clock, Trophy, Target, BookOpen, Home, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { pusherClient } from '@/lib/pusher/client';
import { cn } from '@/lib/utils';

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

    // Abonnement aux invitations de session
    useEffect(() => {
        if (!student?.id) return;

        const channelName = `private-user-${student.id}`;
        console.log('📨 [ELEVE] - Abonnement aux invitations sur le canal:', channelName);

        try {
            const channel = pusherClient.subscribe(channelName);

            channel.bind('session-invitation', (data: SessionInvitation) => {
                console.log('📨 [ELEVE] - Nouvelle invitation de session reçue:', data);
                
                setSessionInvitation(data);
                
                toast({
                    title: '🎯 Nouvelle invitation de session !',
                    description: `${data.teacherName} vous invite à rejoindre une session vidéo.`,
                    duration: 10000, // 10 secondes
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
            });

            channel.bind('subscription_succeeded', () => {
                console.log('✅ [ELEVE] - Abonnement aux invitations réussi');
            });

            return () => {
                console.log('🔚 [ELEVE] - Désabonnement des invitations');
                pusherClient.unsubscribe(channelName);
            };
        } catch (error) {
            console.error('❌ [ELEVE] - Erreur d\'abonnement aux invitations:', error);
        }
    }, [student?.id, toast]);

    const handleAcceptInvitation = useCallback(async (invitation: SessionInvitation) => {
        console.log('✅ [ELEVE] - Acceptation de l\'invitation:', invitation.sessionId);
        setIsJoiningSession(true);
        
        try {
            // Fermer la notification
            setSessionInvitation(null);
            
            // Redirection vers la session
            toast({
                title: 'Connexion...',
                description: 'Rejoignement la session vidéo',
            });
            
            router.push(`/session/${invitation.sessionId}`);
            
        } catch (error) {
            console.error('❌ [ELEVE] - Erreur lors de la connexion à la session:', error);
            toast({
                variant: 'destructive',
                title: 'Erreur de connexion',
                description: 'Impossible de rejoindre la session',
            });
        } finally {
            setIsJoiningSession(false);
        }
    }, [router, toast]);

    const handleDeclineInvitation = useCallback(() => {
        console.log('❌ [ELEVE] - Refus de l\'invitation');
        setSessionInvitation(null);
        toast({
            title: 'Invitation refusée',
            description: 'Vous pouvez rejoindre la session plus tard depuis cette notification',
        });
    }, [toast]);

    // Fonctions utilitaires
    const getTaskIcon = (category: string) => {
        switch (category) {
            case 'MATH': return <Target className="h-4 w-4" />;
            case 'LANGUAGE': return <BookOpen className="h-4 w-4" />;
            case 'SCIENCE': return <Trophy className="h-4 w-4" />;
            case 'HOME': return <Home className="h-4 w-4" />;
            case 'SOCIAL': return <Users className="h-4 w-4" />;
            default: return <BookOpen className="h-4 w-4" />;
        }
    };

    const getTaskColor = (category: string) => {
        switch (category) {
            case 'MATH': return 'bg-blue-100 text-blue-800';
            case 'LANGUAGE': return 'bg-green-100 text-green-800';
            case 'SCIENCE': return 'bg-purple-100 text-purple-800';
            case 'HOME': return 'bg-orange-100 text-orange-800';
            case 'SOCIAL': return 'bg-pink-100 text-pink-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getProgressStatus = (task: AppTask) => {
        const progress = student.progress?.find(p => p.taskId === task.id);
        if (!progress) return { status: 'todo', text: 'À faire', color: 'bg-gray-200' };
        
        switch (progress.status) {
            case 'VERIFIED': 
                return { status: 'completed', text: 'Validé', color: 'bg-green-500' };
            case 'PENDING_VALIDATION': 
                return { status: 'pending', text: 'En attente', color: 'bg-yellow-500' };
            case 'IN_PROGRESS': 
                return { status: 'in-progress', text: 'En cours', color: 'bg-blue-500' };
            default: 
                return { status: 'todo', text: 'À faire', color: 'bg-gray-200' };
        }
    };

    // Calcul des statistiques
    const completedTasks = student.progress?.filter(p => p.status === 'VERIFIED').length || 0;
    const pendingTasks = student.progress?.filter(p => p.status === 'PENDING_VALIDATION').length || 0;
    const totalPoints = student.points || 0;

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Bannière d'invitation en cours */}
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
                                    {isJoiningSession ? (
                                        <>
                                            <Clock className="h-4 w-4 animate-spin mr-2" />
                                            Connexion...
                                        </>
                                    ) : (
                                        <>
                                            <Video className="h-4 w-4 mr-2" />
                                            Rejoindre
                                        </>
                                    )}
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

            {/* En-tête du profil étudiant */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage 
                                src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${student.id}`} 
                                alt={student.name || 'Élève'}
                            />
                            <AvatarFallback>
                                {student.name?.charAt(0)?.toUpperCase() || 'E'}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <div className="flex items-center space-x-2">
                                <h1 className="text-2xl font-bold">{student.name}</h1>
                                {student.etat?.metier && (
                                    <Badge variant="secondary" className="ml-2">
                                        {student.etat.metier.nom}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-muted-foreground">{student.email}</p>
                            <div className="flex items-center space-x-4 mt-2">
                                <div className="flex items-center space-x-1">
                                    <Trophy className="h-4 w-4 text-yellow-500" />
                                    <span className="font-semibold">{totalPoints} points</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    <span>{completedTasks} tâches validées</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Statistiques rapides */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                            <div className="bg-blue-100 p-2 rounded-full">
                                <Target className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">Tâches complétées</p>
                                <p className="text-2xl font-bold">{completedTasks}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                            <div className="bg-yellow-100 p-2 rounded-full">
                                <Clock className="h-4 w-4 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">En attente</p>
                                <p className="text-2xl font-bold">{pendingTasks}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                            <div className="bg-green-100 p-2 rounded-full">
                                <Trophy className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">Points totaux</p>
                                <p className="text-2xl font-bold">{totalPoints}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Onglets principaux */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="tasks">Mes Tâches</TabsTrigger>
                    <TabsTrigger value="announcements">Annonces</TabsTrigger>
                </TabsList>

                {/* Onglet Tâches */}
                <TabsContent value="tasks" className="space-y-4">
                    <div className="grid gap-4">
                        {tasks.map((task) => {
                            const progress = getProgressStatus(task);
                            return (
                                <Card key={task.id} className={cn(
                                    'transition-all hover:shadow-md',
                                    progress.status === 'completed' && 'border-green-200 bg-green-50'
                                )}>
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <div className={cn('p-2 rounded-full', getTaskColor(task.category))}>
                                                    {getTaskIcon(task.category)}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold">{task.title}</h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        {task.description}
                                                    </p>
                                                    <div className="flex items-center space-x-2 mt-1">
                                                        <Badge variant="outline">
                                                            {task.points} pts
                                                        </Badge>
                                                        <Badge variant="secondary">
                                                            {task.type}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-4">
                                                <div className="text-right">
                                                    <Badge 
                                                        variant={
                                                            progress.status === 'completed' ? 'default' :
                                                            progress.status === 'pending' ? 'secondary' : 'outline'
                                                        }
                                                        className={cn(
                                                            progress.status === 'completed' && 'bg-green-100 text-green-800',
                                                            progress.status === 'pending' && 'bg-yellow-100 text-yellow-800'
                                                        )}
                                                    >
                                                        {progress.text}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </TabsContent>

                {/* Onglet Annonces */}
                <TabsContent value="announcements" className="space-y-4">
                    {announcements.length === 0 ? (
                        <Card>
                            <CardContent className="p-6 text-center">
                                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-semibold">Aucune annonce</h3>
                                <p className="text-muted-foreground">
                                    Aucune annonce n'a été publiée pour le moment.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {announcements.map((announcement) => (
                                <Card key={announcement.id}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center justify-between">
                                            {announcement.title}
                                            <Badge variant="outline">
                                                {new Date(announcement.createdAt).toLocaleDateString()}
                                            </Badge>
                                        </CardTitle>
                                        <CardDescription>
                                            Par {announcement.author.name}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="whitespace-pre-wrap">{announcement.content}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}