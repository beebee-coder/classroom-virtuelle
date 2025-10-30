// src/components/StudentPageClient.tsx - CORRECTION
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bell, Video, CheckCircle, XCircle, Clock, Trophy, Target, Users, Wifi, WifiOff, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getPusherClient } from '@/lib/pusher/client';
import { cn } from '@/lib/utils';
import { KeyRound } from 'lucide-react';
import { endCoursSession } from '@/lib/actions/session.actions';
import { CareerSelector } from '@/components/CareerSelector';
import { TaskBoard } from './TaskBoard';
import { AnnouncementCarousel } from './AnnouncementCarousel';
import { usePresenceForStudent } from '@/hooks/usePresenceForStudent';
import type { User as PrismaUser, Metier as PrismaMetier, Announcement as PrismaAnnouncement, StudentProgress as PrismaStudentProgress, Task as PrismaTask, Classroom, EtatEleve } from '@prisma/client';
import type { Session } from 'next-auth';

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
    user: Session['user'];
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
    const [processedInvitations, setProcessedInvitations] = useState<Set<string>>(new Set());
    const { toast } = useToast();
    const router = useRouter();

    // CORRECTION : Utiliser useRef pour la référence stable du Set
    const processedInvitationsRef = useRef<Set<string>>(new Set());
    
    // CORRECTION : Appeler le hook usePresenceForStudent
    const { isConnected, error, teacherOnline } = usePresenceForStudent(
        student.id,
        student.classeId ?? undefined,
        true // enabled
    );

    // Synchroniser le ref avec l'état
    useEffect(() => {
        processedInvitationsRef.current = processedInvitations;
    }, [processedInvitations]);

    // CORRECTION : useRef pour les logs uniques
    const hasLoggedRef = useRef(false);
    
    useEffect(() => {
        if (!hasLoggedRef.current) {
            console.log('🧑‍🎓 [CLIENT ÉLÈVE] - Initialisation de la page pour:', student.name);
            hasLoggedRef.current = true;
        }
    }, [student.name]);

    // Afficher le statut de connexion
    useEffect(() => {
        if (error) {
            console.error('❌ [PRESENCE ELEVE] - Erreur de présence:', error);
        }
        
        console.log('📊 [PRESENCE ELEVE] - Statut:', {
            isConnected,
            teacherOnline,
            error
        });
    }, [isConnected, teacherOnline, error]);

    const handleAcceptInvitation = useCallback(async (invitation: SessionInvitation) => {
        console.log('✅ [CLIENT ÉLÈVE] - Acceptation de l\'invitation de session:', invitation.sessionId);
        setIsJoiningSession(true);
        
        try {
            setSessionInvitation(null);
            // Marquer l'invitation comme traitée
            setProcessedInvitations(prev => new Set(prev).add(invitation.sessionId));
            
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

    // CORRECTION : handleInvitation avec dépendances stables
    const handleInvitation = useCallback((data: SessionInvitation) => {
        // Éviter les doublons en utilisant le ref
        if (processedInvitationsRef.current.has(data.sessionId)) {
            console.log('⏭️ [CLIENT ÉLÈVE] - Invitation déjà traitée, ignorée:', data.sessionId);
            return;
        }

        console.log('📨 [CLIENT ÉLÈVE] - Nouvelle invitation de session reçue via Pusher:', data);
        setSessionInvitation(data);
        setProcessedInvitations(prev => new Set(prev).add(data.sessionId));
        
        toast({
            title: '🎯 Invitation de session reçue !',
            description: `Le professeur ${data.teacherName} vous a invité(e).`,
            duration: 10000,
        });
    }, [toast]); // ← SUPPRESSION de processedInvitations des dépendances

    const handleDeclineInvitation = useCallback(() => {
        console.log('🚫 [CLIENT ÉLÈVE] - Invitation refusée.');
        if (sessionInvitation) {
            setProcessedInvitations(prev => new Set(prev).add(sessionInvitation.sessionId));
        }
        setSessionInvitation(null);
        toast({
            title: 'Invitation refusée',
            description: 'Vous pouvez rejoindre la session plus tard si elle est encore active.',
        });
    }, [toast, sessionInvitation]);

    const handleCloseInvitation = useCallback(() => {
        console.log('❌ [CLIENT ÉLÈVE] - Invitation fermée manuellement.');
        setSessionInvitation(null);
    }, []);

    useEffect(() => {
        // Ne s'abonner que si c'est la vue de l'élève
        if (isTeacherView || !student?.id) return;
    
        const checkMissedInvitations = async () => {
            try {
                console.log('📡 [CLIENT ÉLÈVE] - Vérification des invitations manquées...');
                const response = await fetch(`/api/session/pending-invitations?studentId=${student.id}`);
                
                if (response.ok) {
                    const pendingInvitations = await response.json();
                    
                    // FILTRE CRITIQUE : Ne prendre que les invitations récentes (moins de 5 minutes)
                    const recentInvitations = pendingInvitations.filter((inv: any) => {
                        const invitationTime = new Date(inv.data.timestamp).getTime();
                        const currentTime = new Date().getTime();
                        const fiveMinutesAgo = currentTime - (5 * 60 * 1000); // 5 minutes
                        
                        return invitationTime > fiveMinutesAgo;
                    });
                    
                    if (recentInvitations.length > 0) {
                        const latestInvitation = recentInvitations[0].data;
                        
                        // Vérifier si l'invitation a déjà été traitée en utilisant le ref
                        if (!processedInvitationsRef.current.has(latestInvitation.sessionId)) {
                            console.log('📨 [CLIENT ÉLÈVE] - Invitation récente trouvée:', latestInvitation);
                            handleInvitation(latestInvitation);
                        } else {
                            console.log('⏭️ [CLIENT ÉLÈVE] - Invitation récente déjà traitée, ignorée.');
                        }
                    } else {
                        console.log('✅ [CLIENT ÉLÈVE] - Aucune invitation récente trouvée.');
                        
                        // NETTOYAGE : Supprimer les invitations trop anciennes du cache
                        if (pendingInvitations.length > 0) {
                            console.log(`🗑️ [CLIENT ÉLÈVE] - Nettoyage de ${pendingInvitations.length} invitations expirées`);
                            // Marquer toutes les anciennes invitations comme traitées pour éviter les rappels
                            const expiredIds = pendingInvitations.map((inv: any) => inv.data.sessionId);
                            setProcessedInvitations(prev => new Set([...prev, ...expiredIds]));
                        }
                    }
                } else if (response.status !== 404) {
                    const errorData = await response.json();
                    toast({
                        variant: "destructive",
                        title: "Erreur réseau",
                        description: `Impossible de vérifier les invitations: ${errorData.error || response.statusText}`,
                    });
                }
            } catch (error) {
                console.error('❌ [CLIENT ÉLÈVE] - Erreur lors de la vérification des invitations manquées:', error);
            }
        };
        checkMissedInvitations();

        const pusherClient = getPusherClient();
    
        // Canal pour les invitations personnelles
        const invitationChannelName = `private-user-${student.id}`;
        console.log(`🔌 [CLIENT ÉLÈVE] - Abonnement au canal d'invitation: ${invitationChannelName}`);
        const invitationChannel = pusherClient.subscribe(invitationChannelName);
        invitationChannel.bind('session-invitation', handleInvitation);
    
        return () => {
            console.log(`🔌 [CLIENT ÉLÈVE] - Désabonnement des canaux.`);
            pusherClient.unsubscribe(invitationChannelName);
        };
    }, [student?.id, handleInvitation, toast, isTeacherView]); // ← SUPPRESSION de processedInvitations

    // Nettoyer les invitations traitées après un certain temps
    useEffect(() => {
        const timer = setTimeout(() => {
            // Garder seulement les invitations des dernières 24 heures
            setProcessedInvitations(prev => {
                if (prev.size > 10) { // Limiter la taille du Set
                    const newSet = new Set<string>();
                    let count = 0;
                    // Itérer sur le Set pour garder les plus récents (Set conserve l'ordre d'insertion)
                    const recentItems = Array.from(prev).slice(-5);
                    recentItems.forEach(item => newSet.add(item));
                    return newSet;
                }
                return prev;
            });
        }, 30000); // Nettoyer toutes les 30 secondes

        return () => clearTimeout(timer);
    }, [processedInvitations]);

    const metier = student.etat?.metier;
    const completedTasks = student.studentProgress?.filter(p => p.status === 'VERIFIED').length || 0;
    const totalPoints = student.points || 0;

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Bannière de statut de présence */}
            <Card className={cn(
                "border-l-4",
                isConnected ? "border-green-500 bg-green-50" : "border-gray-300 bg-gray-50"
            )}>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            {isConnected ? (
                                <Wifi className="h-5 w-5 text-green-500" />
                            ) : (
                                <WifiOff className="h-5 w-5 text-gray-500" />
                            )}
                            <div>
                                <p className="font-medium">
                                    {isConnected ? "Connecté à la classe" : "Déconnecté de la classe"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {isConnected 
                                        ? teacherOnline 
                                            ? "👨‍🏫 Votre professeur est en ligne" 
                                            : "En attente du professeur..."
                                        : "Connexion en cours..."
                                    }
                                </p>
                            </div>
                        </div>
                        {error && (
                            <Badge variant="destructive" className="text-xs">
                                Erreur de connexion
                            </Badge>
                        )}
                    </div>
                </CardContent>
            </Card>
  {sessionInvitation && (
                <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 shadow-lg relative">
                    <button 
                        onClick={handleCloseInvitation}
                        className="absolute top-3 right-3 text-white/70 hover:text-white transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <CardContent className="p-4 pr-10">
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
                                <div className="flex items-center space-x-1">
                                    <Trophy className="h-4 w-4 text-yellow-500" />
                                    <span>{totalPoints} points</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    <span>{completedTasks} tâches</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                    {isConnected ? (
                                        <Wifi className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <WifiOff className="h-4 w-4 text-gray-500" />
                                    )}
                                    <span className={cn("text-sm", isConnected ? "text-green-600" : "text-gray-500")}>
                                        {isConnected ? "En ligne" : "Hors ligne"}
                                    </span>
                                </div>
                            </div>
                        </div>
                        {student.classe && !isTeacherView && (
                             <Button asChild variant="outline">
                                <a href={`/student/class/${student.classe.id}`}>
                                    <Users className="mr-2 h-4 w-4"/> Ma Classe
                                </a>
                            </Button>
                        )}
                        {!isTeacherView && (
                             <Button asChild variant="outline">
                                <a href={`/student/${student.id}/parent`}>
                                    <KeyRound className="mr-2 h-4 w-4"/> Espace Parent
                                </a>
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
