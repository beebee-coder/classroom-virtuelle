// src/app/student/dashboard/page.tsx
import { Header } from '@/components/Header';
import { notFound, redirect } from 'next/navigation';
import { CareerThemeWrapper } from '@/components/CareerThemeWrapper';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getStudentData } from '@/lib/actions/student.actions';
import { getStudentAnnouncements } from '@/lib/actions/announcement.actions'; // IMPORT MANQUANT AJOUTÉ
import StudentPageClient from '@/components/StudentPageClient';
import { Sidebar, SidebarContent, SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import Menu from '@/components/Menu';
import prisma from '@/lib/prisma';
import type { User, Metier, Announcement, StudentProgress, Task, Classroom, EtatEleve } from '@prisma/client';
import { StudentDashboardError } from '@/components/StudentDashboardError';
import { SessionInvitationListener } from '@/components/SessionInvitationListener';

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

export default async function StudentDashboardPage() {
    console.log('🧑‍🎓 [PAGE] - Chargement du tableau de bord élève.');

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email || session.user.role !== 'ELEVE') {
            console.log('🔒 [PAGE ELEVE] - Redirection: utilisateur non authentifié ou non élève');
            redirect('/login');
        }

        console.log(`✅ [PAGE ELEVE] - Session trouvée pour: ${session.user.name} (${session.user.email})`);

        let student: StudentWithDetails | null = null;
        try {
            // CORRECTION : Trouver l'élève par email d'abord
            const studentByEmail = await prisma.user.findUnique({
                where: { 
                    email: session.user.email,
                    role: 'ELEVE'
                },
                select: { id: true }
            });

            if (!studentByEmail) {
                console.error('❌ [PAGE ELEVE] - Aucun élève trouvé avec cet email');
                notFound();
            }

            console.log(`✅ [PAGE ELEVE] - ID élève trouvé: ${studentByEmail.id}`);
            student = await getStudentData(studentByEmail.id);
            
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

        const metier = student.etat?.metier;
        
        // CORRECTION : Utiliser l'ID élève pour les annonces
        const [announcementsResult, tasksResult, allCareersResult] = await Promise.allSettled([
            getStudentAnnouncements(student.id).catch((err: Error) => { // TYPE AJOUTÉ
                console.error('❌ [PAGE ELEVE] - Erreur lors du chargement des annonces:', err);
                return [] as AnnouncementWithAuthor[];
            }),
            
            prisma.task.findMany({ 
                where: { isActive: true } 
            }).catch((err: Error) => { // TYPE AJOUTÉ
                console.error('❌ [PAGE ELEVE] - Erreur lors du chargement des tâches:', err);
                return [] as Task[];
            }),
            
            prisma.metier.findMany().catch((err: Error) => { // TYPE AJOUTÉ
                console.error('❌ [PAGE ELEVE] - Erreur lors du chargement des métiers:', err);
                return [] as Metier[];
            })
        ]);
// CORRECTION COMPLÈTE ET SÉCURISÉE :
const announcementsData = announcementsResult.status === 'fulfilled' 
    ? announcementsResult.value 
    : [] as AnnouncementWithAuthor[];

const tasksData = tasksResult.status === 'fulfilled' 
    ? tasksResult.value 
    : [] as Task[];

const allCareersData = allCareersResult.status === 'fulfilled' 
    ? allCareersResult.value 
    : [] as Metier[];        console.log(`📦 [PAGE ELEVE] - Données supplémentaires chargées: ${announcementsData.length} annonces, ${tasksData.length} tâches, ${allCareersData.length} métiers.`);

        return (
            <CareerThemeWrapper career={metier ?? undefined}>
                <SidebarProvider>
                    <div className="flex flex-col min-h-screen w-full">
                        <Header user={session.user}>
                           <SidebarTrigger />
                        </Header>
                        <div className="flex flex-1">
                            <Sidebar>
                                <SidebarContent>
                                    <Menu user={session.user} />
                                </SidebarContent>
                            </Sidebar>
                            <SidebarInset>
                                <div className="p-4">
                                  <SessionInvitationListener studentId={session.user.id} />
                                </div>
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
    } catch (error) {
        console.error('❌ [PAGE ELEVE] - Erreur critique dans la page:', error);
        return (
            <StudentDashboardError 
                message="Une erreur inattendue s'est produite. Veuillez rafraîchir la page." 
            />
        );
    }
}

