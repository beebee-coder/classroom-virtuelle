// src/app/teacher/layout.tsx - VERSION CORRIGÉE
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Header } from '@/components/Header';
import Menu from '@/components/Menu';
import { Sidebar, SidebarContent, SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.PROFESSEUR) {
    redirect('/login');
  }

  try {
    console.log(`👨‍🏫 [LAYOUT] Chargement du layout pour le professeur: ${session.user.id}`);

    // ✅ CORRECTION : Récupération optimisée des classes
    const classrooms = await prisma.classroom.findMany({
      where: { 
        professeurId: session.user.id 
      },
      select: { 
        id: true, 
        nom: true 
      },
      orderBy: {
        nom: 'asc'
      }
    });

    // ✅ CORRECTION : Requête CORRIGÉE pour les validations en attente
    // Le modèle Task n'a pas de relation directe avec Classroom
    const tasksToValidate = await prisma.studentProgress.count({
      where: {
        status: 'PENDING_VALIDATION',
        task: {
          validationType: 'PROFESSOR'
        },
        // ✅ CORRECTION : On filtre par les étudiants des classes du professeur
        student: {
          classe: {
            professeurId: session.user.id
          }
        }
      }
    });

    const validationCount = tasksToValidate || 0;

    console.log(`📊 [LAYOUT] ${classrooms.length} classes, ${validationCount} validations en attente`);

    return (
      <SidebarProvider>
        <div className="flex flex-col min-h-screen bg-background">
          <Header user={session.user}>
            <div className="flex items-center gap-4">
              <SidebarTrigger className="h-9 w-9" />
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <span>{classrooms.length} classe{classrooms.length > 1 ? 's' : ''}</span>
                {validationCount > 0 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium">
                    {validationCount} validation{validationCount > 1 ? 's' : ''} en attente
                  </span>
                )}
              </div>
            </div>
          </Header>
          
          <div className="flex flex-1 overflow-hidden">
            <Sidebar 
              variant="inset" 
              className="border-r bg-sidebar"
            >
              <SidebarContent className="flex flex-col h-full">
                <div className="flex-1 overflow-hidden">
                  <Menu 
                    user={session.user} 
                    classrooms={classrooms} 
                    validationCount={validationCount} 
                  />
                </div>
                
                <div className="p-4 border-t bg-sidebar/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-medium text-primary">
                        {session.user.name?.charAt(0) || 'P'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {session.user.name || 'Professeur'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {session.user.email}
                      </p>
                    </div>
                  </div>
                </div>
              </SidebarContent>
            </Sidebar>
            
            <SidebarInset>
              <main className="h-full overflow-auto">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl">
                  {children}
                </div>
              </main>
            </SidebarInset>
          </div>
        </div>
      </SidebarProvider>
    );

  } catch (error) {
    console.error("❌ [LAYOUT] Erreur dans le layout enseignant:", error);
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center p-8 border rounded-lg bg-card shadow-sm max-w-md w-full">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold text-card-foreground mb-3">
            Erreur de chargement
          </h1>
          <p className="text-muted-foreground mb-6 text-sm">
            Une erreur est survenue lors du chargement de l&apos;interface enseignant.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="default">
              <Link href="/teacher/dashboard">
                Réessayer
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">
                Accueil
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }
}