// src/app/teacher/layout.tsx
import { Header } from '@/components/Header';
import Menu from '@/components/Menu';
import { Sidebar, SidebarContent, SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { getTasksForProfessorValidation } from '@/lib/actions/teacher.actions';
import { getAuthSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { ChatSheet } from '@/components/ChatSheet';
import { Role } from '@prisma/client';

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== 'PROFESSEUR') {
    redirect('/login');
  }
  const user = session.user;

  // Fetch data required for the layout, e.g., for the menu
  const classrooms = await prisma.classroom.findMany({
    where: { professeurId: user.id },
    select: { id: true, nom: true },
  });
  const tasksToValidate = await getTasksForProfessorValidation(user.id);
  const validationCount = tasksToValidate.length;

  const firstClassroomId = classrooms.length > 0 ? classrooms[0].id : null;

  return (
    <SidebarProvider>
      <div className="flex flex-col min-h-screen">
        <Header user={user}>
          <SidebarTrigger />
           {firstClassroomId && user.role && (
              <ChatSheet classroomId={firstClassroomId} userId={user.id} userRole={user.role as Role} />
            )}
        </Header>
        <div className="flex flex-1">
          <Sidebar>
            <SidebarContent>
              <Menu user={user} classrooms={classrooms} validationCount={validationCount} />
            </SidebarContent>
          </Sidebar>
          <SidebarInset>
            {children}
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
