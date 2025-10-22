// src/app/student/[id]/page.tsx
import { getAuthSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { getStudentData } from '@/lib/actions/student.actions';
import StudentPageClient from '@/components/StudentPageClient';
import { getStudentAnnouncements } from '@/lib/actions/announcement.actions';
import { CareerThemeWrapper } from '@/components/CareerThemeWrapper';
import { SidebarProvider, Sidebar, SidebarContent, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { Header } from '@/components/Header';
import Menu from '@/components/Menu';
import { ChatSheet } from '@/components/ChatSheet';


// DUMMY DATA
import { dummyCareers, dummyTasks } from '@/lib/dummy-data';

// Cette page sert maintenant de vue publique ou de vue enseignant pour un élève spécifique.
export default async function StudentProfilePage({ params }: { params: { id: string } }) {
    const session = await getAuthSession();
    const viewingUser = session?.user;
    
    // Si aucun utilisateur n'est connecté, on redirige vers la connexion
    if (!viewingUser) {
        redirect('/login');
    }

    // Si un élève essaie d'accéder à sa propre page via l'URL avec ID,
    // on le redirige vers son tableau de bord unifié.
    if (viewingUser.role === 'ELEVE' && viewingUser.id === params.id) {
        redirect('/student/dashboard');
    }

    // Un professeur peut voir la page d'un élève.
    // Un élève ne peut pas voir la page d'un autre élève (logique simplifiée pour la démo).
    if (viewingUser.role === 'ELEVE' && viewingUser.id !== params.id) {
        redirect('/student/dashboard'); 
    }
    
    const student = await getStudentData(params.id);

    if (!student) {
        redirect(viewingUser.role === 'PROFESSEUR' ? '/teacher/dashboard' : '/student/dashboard');
    }
    
    const isTeacherView = viewingUser.role === 'PROFESSEUR';
    const metier = student.etat?.metier;
    const allCareers = isTeacherView ? dummyCareers : [];
    const announcements = await getStudentAnnouncements(student.id);
    const tasks = dummyTasks;
    const classeId = student.classe?.id;


    // Le layout est recréé ici car c'est une page racine pour ce paramètre.
    return (
        <CareerThemeWrapper career={metier ?? undefined}>
          <SidebarProvider>
            <div className="flex flex-col min-h-screen">
              <Header user={viewingUser}>
                  {isTeacherView && <SidebarTrigger />}
              </Header>
              <div className="flex flex-1">
                {isTeacherView && (
                  <Sidebar>
                    <SidebarContent>
                      <Menu user={viewingUser as any} />
                    </SidebarContent>
                  </Sidebar>
                )}
                <SidebarInset>
                  <StudentPageClient
                      student={student}
                      announcements={announcements}
                      allCareers={allCareers}
                      isTeacherView={isTeacherView}
                      tasks={tasks}
                  />
                </SidebarInset>
              </div>
            </div>
          </SidebarProvider>
        </CareerThemeWrapper>
    );
}