// src/app/teacher/layout.tsx
import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth';
import { Header } from '@/components/Header';
import Menu from '@/components/Menu';
import { Sidebar, SidebarContent, SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Role } from '@prisma/client';
import { getTeacherDashboardData } from '@/lib/teacher-data';
import { CreateAnnouncementForm } from '@/components/CreateAnnouncementForm';
import { ResetButton } from '@/components/ResetButton';
import { Megaphone, RefreshCw } from 'lucide-react';
import styles from '@/components/Menu.module.css';
import { cn } from '@/lib/utils';
import React from 'react';


export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();

  if (!session?.user || session.user.role !== Role.PROFESSEUR) {
    redirect('/login');
  }

  const { classrooms, validationCount } = await getTeacherDashboardData(session.user.id);
  
  // Composants pour les actions du menu qui nécessitent des déclencheurs de dialogue
  const announcementTrigger = (
      <CreateAnnouncementForm classrooms={classrooms}>
        <button className={cn(styles.button, styles.purple)}>
            <Megaphone className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">Créer une Annonce</span>
        </button>
      </CreateAnnouncementForm>
  );

  const resetTrigger = (
      <ResetButton>
        <button className={cn(styles.button, styles.red)}>
            <RefreshCw className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">Remise à zéro</span>
        </button>
      </ResetButton>
  );


  return (
    <SidebarProvider>
      <div className="flex flex-col min-h-screen w-full">
        <Header>
            <div className="flex items-center gap-4">
              <SidebarTrigger className="h-9 w-9" />
            </div>
        </Header>

        <div className="flex flex-1 overflow-hidden min-w-0">
          <Sidebar>
            <SidebarContent>
              <Menu
                user={session.user}
                classrooms={classrooms}
                validationCount={validationCount}
                announcementTrigger={announcementTrigger}
                resetTrigger={resetTrigger}
              />
            </SidebarContent>
          </Sidebar>

          <SidebarInset>
            <main className="h-full overflow-auto">{children}</main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
