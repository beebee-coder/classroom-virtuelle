
// src/app/teacher/layout.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Header } from '@/components/Header';
import Menu from '@/components/Menu';
import { Sidebar, SidebarContent, SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ChatSheet } from '@/components/ChatSheet';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== 'PROFESSEUR') {
    redirect('/login');
  }

  try {
    console.log(`👨‍🏫 [LAYOUT] Chargement du layout pour le professeur: ${session.user.id}`);

    const classrooms = await prisma.classroom.findMany({
      where: { professeurId: session.user.id },
      select: { id: true, nom: true },
    });

    const tasksToValidate = await prisma.studentProgress.count({
      where: {
        status: 'PENDING_VALIDATION',
        task: {
          validationType: 'PROFESSOR'
        },
        student: {
          classe: {
            professeurId: session.user.id
          }
        }
      }
    });

    const validationCount = tasksToValidate;
    const firstClassroomId = classrooms.length > 0 ? classrooms[0].id : null;

    console.log(`📊 [LAYOUT] ${classrooms.length} classes, ${validationCount} validations en attente`);

    return (
      <SidebarProvider>
        <div className="flex flex-col min-h-screen">
          <Header user={session.user}>
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              {firstClassroomId && session.user.role && (
                <ChatSheet 
                  classroomId={firstClassroomId} 
                  userId={session.user.id} 
                  userRole={session.user.role as Role} 
                />
              )}
            </div>
          </Header>
          <div className="flex flex-1 ">
            <Sidebar>
              <SidebarContent>
                <Menu 
                  user={session.user} 
                  classrooms={classrooms} 
                  validationCount={validationCount} 
                />
              </SidebarContent>
            </Sidebar>
            <SidebarInset>
              <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
              </main>
            </SidebarInset>
          </div>
        </div>
      </SidebarProvider>
    );

  } catch (error) {
    console.error("❌ [LAYOUT] Erreur dans le layout enseignant:", error);
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8 border rounded-lg shadow-md max-w-md">
          <h1 className="text-2xl font-bold text-destructive mb-4">
            Erreur de chargement
          </h1>
          <p className="text-muted-foreground mb-6">
            Impossible de charger les données pour la section enseignant. Veuillez réessayer plus tard ou contacter le support.
          </p>
          <Button asChild>
            <Link href="/teacher/dashboard">
              Retour au tableau de bord
            </Link>
          </Button>
        </div>
      </div>
    );
  }
}

    