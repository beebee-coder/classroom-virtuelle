// src/app/student/[id]/page.tsx
import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { getStudentData } from '@/lib/actions/student.actions';
import StudentPageClient from '@/components/StudentPageClient';
import { getStudentAnnouncements } from '@/lib/actions/announcement.actions';
import { CareerThemeWrapper } from '@/components/CareerThemeWrapper';
import { SidebarProvider, Sidebar, SidebarContent, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { Header } from '@/components/Header';
import Menu from '@/components/Menu';
import prisma from '@/lib/prisma';
import type { User, Metier, Announcement, StudentProgress, Task, Classroom, EtatEleve } from '@prisma/client';
import { ChatSheet } from '@/components/ChatSheet';

// Type cohérent avec getStudentData
type StudentWithDetails = User & {
    classe: Classroom | null;
    etat: (EtatEleve & { metier: Metier | null }) | null;
    studentProgress: StudentProgress[];
};

type AnnouncementWithAuthor = Announcement & {
    author: { name: string | null };
};

export default async function StudentProfilePage({ params }: { params: { id: string } }) {
  try {
    const session = await auth();
    const viewingUser = session?.user;
    
    if (!viewingUser) {
      redirect('/login');
    }

    // Si un élève essaie d'accéder à une page d'un autre élève
    if (viewingUser.role === 'ELEVE' && viewingUser.id !== params.id) {
      redirect('/student/dashboard');
    }

    const student = await getStudentData(params.id);

    if (!student) {
      console.error('❌ [PAGE] - Élève non trouvé avec ID:', params.id);
      notFound();
    }
    
    const isTeacherView = viewingUser.role === 'PROFESSEUR';
    const metier = student.etat?.metier;
    const allCareers = isTeacherView ? await prisma.metier.findMany() : [];
    const announcements = await getStudentAnnouncements(student.id);
    const tasks = await prisma.task.findMany({ where: { isActive: true } });
    const classeId = student.classe?.id;

    return (
      <CareerThemeWrapper career={metier ?? undefined}>
        <SidebarProvider>
          <div className="flex flex-col min-h-screen">
            <Header user={viewingUser}>
                {isTeacherView && <SidebarTrigger />}
                {classeId && viewingUser.role === 'ELEVE' && (
                  <ChatSheet classroomId={classeId} userId={viewingUser.id} userRole={viewingUser.role} />
                )}
            </Header>
            <div className="flex flex-1">
              {isTeacherView && (
                <Sidebar>
                  <SidebarContent>
                    <Menu user={viewingUser} />
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
                    user={viewingUser}
                />
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
