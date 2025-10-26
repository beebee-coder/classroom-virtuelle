// src/app/student/dashboard/page.tsx
import { Header } from '@/components/Header';
import { notFound, redirect } from 'next/navigation';
import { CareerThemeWrapper } from '@/components/CareerThemeWrapper';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { ChatSheet } from '@/components/ChatSheet';
import { getStudentAnnouncements } from '@/lib/actions/announcement.actions';
import { getStudentData } from '@/lib/actions/student.actions';
import StudentPageClient from '@/components/StudentPageClient';
import { Sidebar, SidebarContent, SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import Menu from '@/components/Menu';
import prisma from '@/lib/prisma';
import type { User, Metier, Announcement, StudentProgress, Task, Classroom, EtatEleve } from '@prisma/client';
import { AlertCircle } from 'lucide-react';
export const dynamic = 'force-dynamic';

// Type cohérent avec ce que retourne getStudentData
type StudentWithDetails = User & {
    classe: Classroom | null;
    etat: (EtatEleve & { metier: Metier | null }) | null;
    studentProgress: StudentProgress[];
};

type AnnouncementWithAuthor = Announcement & {
    author: { name: string | null };
};

// Composant d'erreur pour le dashboard élève
function StudentDashboardError({ message }: { message: string }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center p-8 max-w-md">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-destructive mb-2">Erreur de chargement</h1>
                <p className="text-muted-foreground mb-4">{message}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                    Réessayer
                </button>
            </div>
        </div>
    );
}

export default async function StudentDashboardPage() {
    console.log('🧑‍🎓 [PAGE] - Chargement du tableau de bord élève.');

    try {
        // Authentification
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || session.user.role !== 'ELEVE') {
            console.log('🔒 [PAGE ELEVE] - Redirection: utilisateur non authentifié ou non élève');
            redirect('/login');
        }

        // Chargement des données de l'élève
        let student: StudentWithDetails | null = null;
        try {
            student = await getStudentData(session.user.id);
        } catch (studentError) {
            console.error('❌ [PAGE ELEVE] - Erreur lors du chargement des données élève:', studentError);
            throw new Error('Impossible de charger vos données. Veuillez réessayer.');
        }

        if (!student) {
            console.error('❌ [PAGE ELEVE] - Données de l\'élève non trouvées, redirection.');
            notFound();
        }

        console.log('✅ [PAGE ELEVE] - Données de l\'élève chargées:', student.name);

        // Chargement des données supplémentaires avec gestion d'erreur individuelle
        const metier = student.etat?.metier;
        const classeId = student.classe?.id;

        let announcements: AnnouncementWithAuthor[] = [];
        let tasks: Task[] = [];

        try {
            announcements = await getStudentAnnouncements(student.id);
            console.log(`✅ [PAGE ELEVE] - ${announcements.length} annonces chargées`);
        } catch (announcementsError) {
            console.error('❌ [PAGE ELEVE] - Erreur lors du chargement des annonces:', announcementsError);
            // On continue avec un tableau vide pour les annonces
        }

        try {
            tasks = await prisma.task.findMany({ 
                where: { isActive: true } 
            });
            console.log(`✅ [PAGE ELEVE] - ${tasks.length} tâches chargées`);
        } catch (tasksError) {
            console.error('❌ [PAGE ELEVE] - Erreur lors du chargement des tâches:', tasksError);
            // On continue avec un tableau vide pour les tâches
        }

        // Récupération de tous les métiers pour le composant client
        let allCareers: Metier[] = [];
        try {
            allCareers = await prisma.metier.findMany();
            console.log(`✅ [PAGE ELEVE] - ${allCareers.length} métiers chargés`);
        } catch (careersError) {
            console.error('❌ [PAGE ELEVE] - Erreur lors du chargement des métiers:', careersError);
            // On continue avec un tableau vide pour les métiers
        }

        return (
            <CareerThemeWrapper career={metier ?? undefined}>
                <SidebarProvider>
                    <div className="flex flex-col min-h-screen w-full">
                        <Header user={session.user}>
                            <SidebarTrigger />
                            {classeId && session.user.role && (
                                <ChatSheet 
                                    classroomId={classeId} 
                                    userId={session.user.id} 
                                    userRole={session.user.role} 
                                />
                            )}
                        </Header>
                        <div className="flex flex-1">
                            <Sidebar>
                                <SidebarContent>
                                    <Menu user={session.user} />
                                </SidebarContent>
                            </Sidebar>
                            <SidebarInset>
                                <StudentPageClient
                                    student={student}
                                    announcements={announcements}
                                    allCareers={allCareers}
                                    isTeacherView={false}
                                    tasks={tasks}
                                    user={session.user}
                                />
                            </SidebarInset>
                        </div>
                    </div>
                </SidebarProvider>
            </CareerThemeWrapper>
        );

    } catch (error) {
        console.error('💥 [PAGE ELEVE] - Erreur critique lors du chargement du tableau de bord:', error);

        // Si c'est une erreur de données élève, on redirige vers login
        if (error instanceof Error && error.message.includes('Impossible de charger vos données')) {
            redirect('/login');
        }

        // Pour les autres erreurs, on affiche une page d'erreur
        return (
            <StudentDashboardError 
                message="Impossible de charger votre tableau de bord. Veuillez vérifier votre connexion et réessayer." 
            />
        );
    }
}