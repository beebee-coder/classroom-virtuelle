// src/app/student/dashboard/page.tsx
import { Header } from '@/components/Header';
import { notFound, redirect } from 'next/navigation';
import { CareerThemeWrapper } from '@/components/CareerThemeWrapper';
import { auth } from '@/auth';
import { ChatSheet } from '@/components/ChatSheet';
import { getStudentAnnouncements } from '@/lib/actions/announcement.actions';
import { getStudentData } from '@/lib/actions/student.actions';
import StudentPageClient from '@/components/StudentPageClient';
import { Sidebar, SidebarContent, SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import Menu from '@/components/Menu';
import prisma from '@/lib/prisma';
import type { User, Metier, Announcement, StudentProgress, Task, Classroom, EtatEleve } from '@prisma/client';

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

// CORRECTION: Composant d'erreur sans interactivité
function StudentDashboardError({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-destructive mb-4">Erreur</h1>
        <p className="text-muted-foreground mb-6">{message}</p>
        <p className="text-sm text-muted-foreground">
          Veuillez recharger la page ou contacter l'administrateur.
        </p>
      </div>
    </div>
  );
}

export default async function StudentDashboardPage() {
    console.log('🧑‍🎓 [PAGE] - Chargement du tableau de bord élève.');

    // Authentification
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'ELEVE') {
        console.log('🔒 [PAGE ELEVE] - Redirection: utilisateur non authentifié ou non élève');
        redirect('/login');
    }

    console.log(`✅ [PAGE ELEVE] - Session trouvée pour: ${session.user.name} (${session.user.id})`);

    let student: StudentWithDetails | null = null;
    try {
        student = await getStudentData(session.user.id);
    } catch (studentError) {
        console.error('❌ [PAGE ELEVE] - Erreur lors du chargement des données élève:', studentError);
        return (
            <StudentDashboardError 
                message="Impossible de charger vos données. Veuillez vérifier votre connexion et réessayer." 
            />
        );
    }

    if (!student) {
        console.error('❌ [PAGE ELEVE] - Aucune donnée retournée par getStudentData. Affichage de la page Not Found.');
        notFound();
    }
    
    console.log('✅ [PAGE ELEVE] - Données de l\'élève chargées:', student.name);

    // Chargement des données supplémentaires
    const metier = student.etat?.metier;
    const classeId = student.classe?.id;

    console.log(`📊 [PAGE ELEVE] - Métier: ${metier?.nom || 'Aucun'}, Classe: ${classeId || 'Aucune'}`);

    // Chargement parallèle des données pour de meilleures performances
    const [announcements, tasks, allCareers] = await Promise.allSettled([
        getStudentAnnouncements(student.id).catch(err => {
            console.error('❌ [PAGE ELEVE] - Erreur lors du chargement des annonces:', err);
            return [] as AnnouncementWithAuthor[]; // Retourner un tableau vide en cas d'erreur
        }),
        
        prisma.task.findMany({ where: { isActive: true } }).catch(err => {
            console.error('❌ [PAGE ELEVE] - Erreur lors du chargement des tâches:', err);
            return [] as Task[]; // Retourner un tableau vide en cas d'erreur
        }),
        
        prisma.metier.findMany().catch(err => {
            console.error('❌ [PAGE ELEVE] - Erreur lors du chargement des métiers:', err);
            return [] as Metier[]; // Retourner un tableau vide en cas d'erreur
        })
    ]);

    // Extraction des résultats avec gestion d'erreur
    const announcementsData = announcements.status === 'fulfilled' ? announcements.value : [];
    const tasksData = tasks.status === 'fulfilled' ? tasks.value : [];
    const allCareersData = allCareers.status === 'fulfilled' ? allCareers.value : [];

    console.log(`📦 [PAGE ELEVE] - Données supplémentaires chargées: ${announcementsData.length} annonces, ${tasksData.length} tâches, ${allCareersData.length} métiers.`);

    return (
        <CareerThemeWrapper career={metier ?? undefined}>
            <SidebarProvider>
                <div className="flex flex-col min-h-screen w-full">
                    <Header user={session.user}>
                        <div className="flex items-center gap-2">
                            <SidebarTrigger />
                            {classeId && session.user.role && (
                                <ChatSheet 
                                    classroomId={classeId} 
                                    userId={session.user.id} 
                                    userRole={session.user.role} 
                                />
                            )}
                        </div>
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
                                announcements={announcementsData}
                                allCareers={allCareersData}
                                isTeacherView={false}
                                tasks={tasksData}
                                user={session.user}
                            />
                        </SidebarInset>
                    </div>
                </div>
            </SidebarProvider>
        </CareerThemeWrapper>
    );
}
