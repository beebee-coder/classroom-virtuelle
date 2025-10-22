// src/app/teacher/layout.tsx
import { Header } from '@/components/Header';
import Menu from '@/components/Menu';
import { Sidebar, SidebarContent, SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { getTasksForProfessorValidation } from '@/lib/actions/teacher.actions';
import { getAuthSession } from '@/lib/session';
import { redirect } from 'next/navigation';

// DUMMY DATA
const dummyClassrooms = [
  { id: 'classe-a', nom: 'Classe 6ème A' },
  { id: 'classe-b', nom: 'Classe 6ème B' },
  { id: 'classe-c', nom: 'Classe 5ème A' },
];

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
  const classrooms = dummyClassrooms;
  const tasksToValidate = await getTasksForProfessorValidation(user.id);
  const validationCount = tasksToValidate.length;

  return (
    <SidebarProvider>
      <div className="flex flex-col min-h-screen">
        <Header user={user}>
          <SidebarTrigger />
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
