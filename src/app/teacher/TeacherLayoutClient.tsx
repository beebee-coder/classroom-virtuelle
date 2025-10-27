// src/app/teacher/TeacherLayoutClient.tsx
'use client';

import { Header } from '@/components/Header';
import Menu from '@/components/Menu';
import { Sidebar, SidebarContent, SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ChatSheet } from '@/components/ChatSheet';
import { Role } from '@prisma/client';
import type { Session } from 'next-auth';

interface ClassroomData {
  id: string;
  nom: string;
}

interface TeacherLayoutClientProps {
  user: Session['user'];
  classrooms: ClassroomData[];
  validationCount: number;
  firstClassroomId: string | null;
  children: React.ReactNode;
}

export default function TeacherLayoutClient({
  user,
  classrooms,
  validationCount,
  firstClassroomId,
  children
}: TeacherLayoutClientProps) {

  return (
    <SidebarProvider>
      <div className="flex flex-col min-h-screen">
        <Header user={user}>
          <SidebarTrigger />
          {firstClassroomId && user.role && (
            <ChatSheet 
              classroomId={firstClassroomId} 
              userId={user.id} 
              userRole={user.role as Role} 
            />
          )}
        </Header>
        <div className="flex flex-1">
          <Sidebar>
            <SidebarContent>
              <Menu 
                user={user} 
                classrooms={classrooms} 
                validationCount={validationCount} 
              />
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
