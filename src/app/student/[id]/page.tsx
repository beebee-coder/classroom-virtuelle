// src/app/student/[id]/page.tsx
import { getAuthSession } from "@/lib/auth";
import { redirect, notFound } from 'next/navigation';
import { getStudentData } from '@/lib/actions/student.actions';
import { getActiveTasks } from '@/lib/actions/task.actions';
import { getMetiers } from '@/lib/actions/teacher.actions';
import StudentPageClient from '@/components/StudentPageClient';
import { getStudentAnnouncements } from '@/lib/actions/announcement.actions';
import { CareerThemeWrapper } from '@/components/CareerThemeWrapper';
import { SidebarProvider, Sidebar, SidebarContent, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { Header } from '@/components/Header';
import Menu from '@/components/Menu';
import { ChatSheet } from '@/components/ChatSheet';
import type { User, Metier, Announcement, StudentProgress, Task, Classroom, EtatEleve } from '@prisma/client';

export default async function StudentProfilePage({ params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession();
    const viewingUser = session?.user;
    
    if (!viewingUser) {
      redirect('/login');
    }

    if (viewingUser.role === 'ELEVE' && viewingUser.id !== params.id) {
      redirect('/student/dashboard');
    }

    const student = await getStudentData(params.id);

    if (!student) {
      console.error('❌ [PAGE] - Élève non trouvé avec ID:', params.id);
      notFound();
    }
    
    const isTeacherView = viewingUser.role === 'PROFESSEUR';
    
    // Déplacer les requêtes Prisma dans des actions serveur
    const [allCareers, announcements, tasks] = await Promise.all([
      isTeacherView ? getMetiers() : Promise.resolve([]),
      getStudentAnnouncements(student.id),
      getActiveTasks()
    ]);
    
    const metier = student.etat?.metier;
    const classeId = student.classe?.id;

    const pageContent = (
        <StudentPageClient
            student={student}
            announcements={announcements}
            allCareers={allCareers}
            isTeacherView={isTeacherView}
            tasks={tasks}
            user={viewingUser}
        />
    );

    if (isTeacherView) {
        return pageContent;
    }
    
    return (
      <CareerThemeWrapper career={metier ?? undefined}>
        <SidebarProvider>
          <div className="flex flex-col min-h-screen">
            <Header >
                {classeId && viewingUser.role === 'ELEVE' && (
                  <ChatSheet classroomId={classeId} userId={viewingUser.id} userRole={viewingUser.role} />
                )}
            </Header>
            <div className="flex flex-1">
              <Sidebar>
                <SidebarContent>
                  <Menu user={viewingUser} />
                </SidebarContent>
              </Sidebar>
              <SidebarInset>
                {pageContent}
              </SidebarInset>
            </div>
          </div>
        </SidebarProvider>
      </CareerThemeWrapper>
    );
  } catch (error) {
    console.error('❌ [PAGE] - Erreur lors du chargement du profil élève:', error);
    redirect('/login');
  }
}
