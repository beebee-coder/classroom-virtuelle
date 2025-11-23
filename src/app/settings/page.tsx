// src/app/settings/page.tsx - VERSION CORRIGÉE
import { redirect } from 'next/navigation';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { Header } from '@/components/Header';
import { BackButton } from '@/components/BackButton';
import { SettingsClient } from '@/components/SettingsClient';
import { Sidebar, SidebarContent, SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import Menu from '@/components/Menu';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

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
      <div className="flex flex-col min-h-screen w-full "> {/* ✅ CORRECTION: ajout de w-full */}
        <Header user={user}>
          {isTeacher && <SidebarTrigger />}
        </Header>
        <div className="flex flex-1 w-full overflow-hidden bg-blue-900"> {/* ✅ CORRECTION: ajout de w-full */}
          {isTeacher && (
            <Sidebar className="min-w-[280px] w-[280px]"> {/* ✅ CORRECTION: largeur fixe */}
              <SidebarContent>
                <Menu user={user} />
              </SidebarContent>
            </Sidebar>
          )}
          <SidebarInset className="flex-1 min-w-0"> {/* ✅ CORRECTION: min-w-0 pour permettre le rétrécissement */}
            <div className="h-full overflow-auto w-full"> {/* ✅ CORRECTION: w-full */}
              <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8"> {/* ✅ CORRECTION: max-width limité */}
                <div className="flex items-center gap-4 mb-8">
                  <BackButton />
                  <div className="min-w-0 flex-1"> {/* ✅ CORRECTION: gestion du texte long */}
                    <h1 className="text-3xl font-bold tracking-tight truncate ">Paramètres</h1>
                    <p className="text-muted-foreground truncate">
                      Gérez les informations de votre compte et vos préférences.
                    </p>
                  </div>
                </div>
                
                {/* ✅ CORRECTION: Container avec hauteur et défilement contrôlés */}
                <div className="bg-card rounded-lg border shadow-sm">
                  <SettingsClient user={user} />
                </div>
              </main>
            </div>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}