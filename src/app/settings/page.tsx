// src/app/settings/page.tsx
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { Header } from '@/components/Header';
import { BackButton } from '@/components/BackButton';
import { SettingsClient } from '@/components/SettingsClient';
import { Sidebar, SidebarContent, SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import Menu from '@/components/Menu';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  });

  if (!user) {
    redirect('/login');
  }
  
  const isTeacher = user.role === 'PROFESSEUR';

  return (
    <SidebarProvider>
      <div className="flex flex-col min-h-screen">
        <Header user={user}>
          {isTeacher && <SidebarTrigger />}
        </Header>
        <div className="flex flex-1">
          {isTeacher && (
            <Sidebar>
              <SidebarContent>
                <Menu user={user} />
              </SidebarContent>
            </Sidebar>
          )}
          <SidebarInset>
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="flex items-center gap-4 mb-8">
                <BackButton />
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
                  <p className="text-muted-foreground">
                    Gérez les informations de votre compte et vos préférences.
                  </p>
                </div>
              </div>
              <SettingsClient user={user} />
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
