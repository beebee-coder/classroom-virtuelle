// src/app/student/dashboard/page.tsx
import { Header } from '@/components/Header';
import { notFound, redirect } from 'next/navigation';
import { CareerThemeWrapper } from '@/components/CareerThemeWrapper';
import { getAuthSession } from '@/lib/session';
import { ChatSheet } from '@/components/ChatSheet';
import { getStudentAnnouncements } from '@/lib/actions/announcement.actions';
import { getStudentData } from '@/lib/actions/student.actions';
import StudentPageClient from '@/components/StudentPageClient';
import { Sidebar, SidebarContent, SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import Menu from '@/components/Menu';
import prisma from '@/lib/prisma';
import type { User, Metier, Announcement, StudentProgress, Task, Classroom, EtatEleve } from '@prisma/client';

// Re-définir les types complexes basés sur Prisma
type StudentWithDetails = User & {
    classe: Classroom | null;
    etat: (EtatEleve & { metier: Metier | null }) | null;
    progress: StudentProgress[];
};

type AnnouncementWithAuthor = Announcement & {
    author: { name: string | null };
};

export default async function StudentDashboardPage() {
  console.log('🧑‍🎓 [PAGE] - Chargement du tableau de bord élève.');

  const session = await getAuthSession();
  if (!session?.user?.id || session.user.role !== 'ELEVE') {
    redirect('/login');
  }
  
  const student: StudentWithDetails | null = await getStudentData(session.user.id);
  
  if (!student) {
    console.error('❌ [PAGE] - Données de l\'élève non trouvées, redirection.');
    notFound();
  }
  
  console.log('✅ [PAGE] - Données de l\'élève chargées:', student.name);

  const metier = student.etat?.metier;
  const classeId = student.classe?.id;
  const announcements = (await getStudentAnnouncements(student.id)) as AnnouncementWithAuthor[];
  const tasks = await prisma.task.findMany({ where: { isActive: true } });

  return (
    <CareerThemeWrapper career={metier ?? undefined}>
      <SidebarProvider>
        <div className="flex flex-col min-h-screen">
          <Header user={session.user}>
              <SidebarTrigger />
              {classeId && session.user.role && (
                  <ChatSheet classroomId={classeId} userId={session.user.id} userRole={session.user.role} />
              )}
          </Header>
          <div className="flex flex-1">
              <Sidebar>
                <SidebarContent>
                  <Menu user={session.user as any} />
                </SidebarContent>
              </Sidebar>
            <SidebarInset>
              <StudentPageClient
                  student={student}
                  announcements={announcements}
                  allCareers={[]} // Pas besoin de toutes les carrières ici
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
}
