// src/app/student/dashboard/page.tsx
import { Header } from '@/components/Header';
import { notFound, redirect } from 'next/navigation';
import { CareerThemeWrapper } from '@/components/CareerThemeWrapper';
import { getAuthSession } from '@/lib/auth';
import { getStudentData } from '@/lib/actions/student.actions';
import { getActiveTasks } from '@/lib/actions/task.actions';
import { getMetiers } from '@/lib/actions/teacher.actions';
import { getStudentAnnouncements } from '@/lib/actions/announcement.actions';
import StudentPageClient from '@/components/StudentPageClient';
import { Sidebar, SidebarContent, SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import Menu from '@/components/Menu';
import { StudentDashboardError } from '@/components/StudentDashboardError';
import { SessionInvitationListener } from '@/components/SessionInvitationListener';
import type { User, Metier, Announcement, StudentProgress, Task, Classroom, EtatEleve } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function StudentDashboardPage() {
    console.log('🧑‍🎓 [PAGE] - Chargement du tableau de bord élève.');

    try {
        const session = await getAuthSession();
        if (!session?.user?.id || session.user.role !== 'ELEVE') {
            console.log('🔒 [PAGE ELEVE] - Redirection: utilisateur non authentifié ou non élève');
            redirect('/login');
        }

        console.log(`✅ [PAGE ELEVE] - Session trouvée pour: ${session.user.name} (${session.user.email})`);

        let student: any;
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
            console.log('🆕 [PAGE ELEVE] - Élève sans données trouvé. Vérification du statut isNewUser...');
            
            // Vérifier si l'utilisateur est marqué comme "nouveau" dans la session
            // ou s'il n'a pas encore complété son onboarding
            if (!session.user.classeId) {
                console.log('🔄 [PAGE ELEVE] - Élève sans classeId - Redirection vers l\'onboarding');
                redirect('/student/onboarding');
            }
            
            console.error('❌ [PAGE ELEVE] - Aucune donnée retournée par getStudentData mais utilisateur a une classeId.');
            return (
                <StudentDashboardError 
                    message="Votre profil est incomplet. Veuillez contacter votre professeur ou l'administrateur." 
                />
            );
        }
        
        console.log('✅ [PAGE ELEVE] - Données de l\'élève chargées:', student.name);

        const metier = student.etat?.metier;
        
        const [announcements, tasks, allCareers] = await Promise.all([
            getStudentAnnouncements(student.id),
            getActiveTasks(),
            getMetiers()
        ]);
            
        console.log(`📦 [PAGE ELEVE] - Données supplémentaires chargées: ${announcements.length} annonces, ${tasks.length} tâches, ${allCareers.length} métiers.`);

        return (
            <CareerThemeWrapper career={metier ?? undefined}>
                <SidebarProvider>
                    <div className="flex flex-col min-h-screen w-full">
                        <Header >
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
        console.error('❌ [PAGE ELEVE] - Erreur critique dans la page:', error);
        return (
            <StudentDashboardError 
                message="Une erreur inattendue s'est produite. Veuillez rafraîchir la page." 
            />
        );
    }
}