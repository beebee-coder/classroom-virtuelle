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
import prisma from '@/lib/prisma';
import type { User, Metier, Announcement, StudentProgress, Task, Classroom, EtatEleve } from '@prisma/client';

type StudentWithDetails = User & {
    classe: Classroom | null;
    etat: (EtatEleve & { metier: Metier | null }) | null;
    progress: StudentProgress[];
};

type AnnouncementWithAuthor = Announcement & {
    author: { name: string | null };
};

// Cette page sert maintenant de vue publique ou de vue enseignant pour un élève spécifique.
export default async function StudentProfilePage({ params }: { params: { id: string } }) {
    const session = await getAuthSession();
    const viewingUser = session?.user;
    
    // Si aucun utilisateur n'est connecté, on redirige vers la connexion
    if (!viewingUser) {
        redirect('/login');
    }

    // Si un élève essaie d'accéder à une page d'un autre élève,
    // on le redirige vers son tableau de bord unifié.
    if (viewingUser.role === 'ELEVE') {
        redirect('/student/dashboard');
    }

    // Un professeur peut voir la page d'un élève.
    const student = await getStudentData(params.id) as StudentWithDetails;

    if (!student) {
        redirect(viewingUser.role === 'PROFESSEUR' ? '/teacher/dashboard' : '/student/dashboard');
    }
    
    const isTeacherView = viewingUser.role === 'PROFESSEUR';
    const metier = student.etat?.metier;
    const allCareers = isTeacherView ? await prisma.metier.findMany() : [];
    const announcements = (await getStudentAnnouncements(student.id)) as AnnouncementWithAuthor[];
    const tasks = await prisma.task.findMany({ where: { isActive: true } });
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
                      student={student as any}
                      announcements={announcements}
                      allCareers={allCareers}
                      isTeacherView={isTeacherView}
                      tasks={tasks}
                      user={viewingUser}
                  />
                </SidebarInset>
              </div>
            </div>
          </SidebarProvider>
        </CareerThemeWrapper>
    );
}
