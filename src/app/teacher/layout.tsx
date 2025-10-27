// src/app/teacher/layout.tsx
'use client';
import { Header } from '@/components/Header';
import Menu from '@/components/Menu';
import { Sidebar, SidebarContent, SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { getTasksForProfessorValidation } from '@/lib/actions/teacher.actions';
import { getServerSession } from 'next-auth/react';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { ChatSheet } from '@/components/ChatSheet';
import { Role } from '@prisma/client';
import { AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Skeleton } from '@/components/ui/skeleton';


export const dynamic = 'force-dynamic';

// Interface pour les données de classe
interface ClassroomData {
  id: string;
  nom: string;
}

// Composant de layout d'erreur
function TeacherLayoutError({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center p-8 max-w-md">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-destructive mb-2">Erreur</h1>
        <p className="text-muted-foreground mb-4">{message}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
    return (
        <div className="flex flex-col min-h-screen">
          <header className="bg-card border-b top-0 z-50">
             <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
                <Skeleton className="h-8 w-48" />
                <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                </div>
            </div>
          </header>
          <div className="flex flex-1">
             <div className="hidden md:block w-64 border-r p-4">
                <Skeleton className="h-8 w-32 mb-6" />
                <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                </div>
             </div>
             <main className="flex-1 p-8">
                <Skeleton className="h-full w-full" />
             </main>
          </div>
        </div>
    )
}

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const [layoutData, setLayoutData] = useState<{
    classrooms: ClassroomData[];
    validationCount: number;
    firstClassroomId: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      const fetchData = async () => {
        try {
          console.log(`👨‍🏫 [LAYOUT TEACHER] - Chargement des données pour: ${session.user.name}`);

          const classrooms = await prisma.classroom.findMany({
            where: { professeurId: session.user.id },
            select: { id: true, nom: true },
          });

          let validationCount = 0;
          try {
            const tasksToValidate = await getTasksForProfessorValidation(session.user.id);
            validationCount = tasksToValidate.length;
          } catch (validationError) {
            console.error('❌ [LAYOUT TEACHER] - Erreur lors du chargement des validations:', validationError);
          }
          
          const firstClassroomId = classrooms.length > 0 ? classrooms[0].id : null;
          
          console.log(`✅ [LAYOUT TEACHER] - Données chargées: ${classrooms.length} classes, ${validationCount} validations`);
          setLayoutData({ classrooms, validationCount, firstClassroomId });

        } catch (dbError) {
          console.error('❌ [LAYOUT TEACHER] - Erreur de base de données:', dbError);
          setError("Impossible de charger les données du layout.");
        }
      };
      fetchData();
    }
  }, [session, status]);
  
  if (status === 'loading') {
    return <LoadingSkeleton />;
  }

  if (status === 'unauthenticated') {
    redirect('/login');
  }

  if (error) {
    return <TeacherLayoutError message={error} />;
  }

  if (!layoutData || !session?.user) {
    return <LoadingSkeleton />;
  }
  
  const { classrooms, validationCount, firstClassroomId } = layoutData;
  const user = session.user;
  
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
