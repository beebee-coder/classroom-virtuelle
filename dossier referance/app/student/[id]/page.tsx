// src/app/student/[id]/page.tsx
import { Header } from '@/components/Header';
import prisma from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { CareerThemeWrapper } from '@/components/CareerThemeWrapper';
import { StudentWithStateAndCareer } from '@/lib/types';
import { getAuthSession } from '@/lib/session';
import { ChatSheet } from '@/components/ChatSheet';
import { getStudentAnnouncements } from '@/lib/actions/announcement.actions';
import StudentPageClient from '@/components/StudentPageClient';
import { AppTask } from '@/lib/types';
import { Sidebar, SidebarContent, SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import Menu from '@/components/Menu';


async function getStudentData(id: string): Promise<StudentWithStateAndCareer | null> {
    const student = await prisma.user.findUnique({
      where: { id, role: 'ELEVE' },
      include: {
        etat: {
          include: {
            metier: true,
          },
        },
        sessionsParticipees: {
          where: { endedAt: null },
          orderBy: { createdAt: 'desc' }
        },
        progress: {
          include: {
            task: true,
          },
        },
        classe: true,
      },
    });

    if (!student) return null;

    // If the student is punished, do not return the career theme
    if (student.etat?.isPunished && student.etat.metier) {
        return {
            ...student,
            etat: {
                ...student.etat,
                metier: null
            }
        } as unknown as StudentWithStateAndCareer;
    }

    return student as unknown as StudentWithStateAndCareer;
}

export default async function StudentPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const session = await getAuthSession();
  if (!session) {
    redirect('/login');
  }

  const student = await getStudentData(params.id);
  const viewAs = searchParams.viewAs;
  const isTeacherView = viewAs === 'teacher' && session.user.role === 'PROFESSEUR';

  if (!student) {
    notFound();
  }
  
  // Security: a student can only see their own page
  if (session.user.role === 'ELEVE' && student.id !== session.user.id) {
      notFound();
  }


  const metier = student.etat?.metier;
  const allCareers = isTeacherView ? await prisma.metier.findMany() : [];
  
  const classeId = student.classe?.id;
  const announcements = await getStudentAnnouncements(student.id);
  
  const tasks = await prisma.task.findMany({
    where: { isActive: true },
  }) as AppTask[];

  return (
    <CareerThemeWrapper career={metier ?? undefined}>
      <SidebarProvider>
        <div className="flex flex-col min-h-screen">
          <Header user={session.user}>
              {!isTeacherView && <SidebarTrigger />}
              {classeId && !isTeacherView && session.user.role && (
                  <ChatSheet classroomId={classeId} userId={session.user.id} userRole={session.user.role} />
              )}
          </Header>
          <div className="flex flex-1">
            {!isTeacherView && (
              <Sidebar>
                <SidebarContent>
                  <Menu user={session.user} />
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
