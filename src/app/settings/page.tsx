
// src/app/settings/page.tsx
import { redirect } from 'next/navigation';
import { getAuthSession } from "@/lib/auth";
import { Header } from '@/components/Header';
import { BackButton } from '@/components/BackButton';
import { SettingsClient } from '@/components/SettingsClient';
import { Sidebar, SidebarContent, SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import Menu from '@/components/Menu';
import { getUserSettings } from '@/lib/actions/user.actions'; // Action pour récupérer les paramètres utilisateur

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await getAuthSession();

  if (!session?.user) {
    redirect('/login');
  }

  const user = await getUserSettings(session.user.id); // Appel de la nouvelle action

  if (!user) {
    redirect('/login');
  }
  
  const isTeacher = user.role === 'PROFESSEUR';

  return (
    <SidebarProvider>
      <div className="flex flex-col min-h-screen w-full">
        <Header>
          {isTeacher && <SidebarTrigger />}
        </Header>
        <div className="flex flex-1 overflow-hidden min-w-0">
          {isTeacher && (
            <Sidebar className="min-w-[280px] w-[280px]">
              <SidebarContent>
                <Menu user={user} />
              </SidebarContent>
            </Sidebar>
          )}
          <SidebarInset>
            <main className="h-full overflow-auto">
              <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-w-0">
                <div className="flex items-center gap-4 mb-8">
                  <BackButton />
                  <div className="min-w-0 flex-1">
                    <h1 className="text-3xl font-bold tracking-tight truncate ">Paramètres</h1>
                    <p className="text-muted-foreground truncate">
                      Gérez les informations de votre compte et vos préférences.
                    </p>
                  </div>
                </div>
                
                <div className="bg-card rounded-lg border shadow-sm">
                  <SettingsClient user={user} />
                </div>
              </div>
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
