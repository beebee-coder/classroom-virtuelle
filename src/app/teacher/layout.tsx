// src/app/teacher/layout.tsx
import { Header } from '@/components/Header';
import Menu from '@/components/Menu';
import { Sidebar, SidebarContent, SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { getTasksForProfessorValidation } from '@/lib/actions/teacher.actions';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { ChatSheet } from '@/components/ChatSheet';
import { Role } from '@prisma/client';
import { AlertCircle } from 'lucide-react';
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

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'PROFESSEUR') {
      console.log('🔒 [LAYOUT TEACHER] - Redirection: utilisateur non authentifié ou non professeur');
      redirect('/login');
    }

    const user = session.user;
    console.log(`👨‍🏫 [LAYOUT TEACHER] - Chargement du layout pour: ${user.name}`);

    // Initialisation des données avec gestion d'erreur
    let classrooms: ClassroomData[] = [];
    let validationCount = 0;
    let firstClassroomId: string | null = null;

    try {
      // Récupération des classes avec gestion d'erreur
      classrooms = await prisma.classroom.findMany({
        where: { professeurId: user.id },
        select: { 
          id: true, 
          nom: true 
        },
      });

      // Récupération des tâches à valider avec gestion d'erreur
      try {
        const tasksToValidate = await getTasksForProfessorValidation(user.id);
        validationCount = tasksToValidate.length;
      } catch (validationError) {
        console.error('❌ [LAYOUT TEACHER] - Erreur lors du chargement des validations:', validationError);
        // On continue avec validationCount = 0
      }

      // Détermination de la première classe
      firstClassroomId = classrooms.length > 0 ? classrooms[0].id : null;

      console.log(`✅ [LAYOUT TEACHER] - Données chargées: ${classrooms.length} classes, ${validationCount} validations`);

    } catch (databaseError) {
      console.error('❌ [LAYOUT TEACHER] - Erreur de base de données:', databaseError);
      // On continue avec les valeurs par défaut pour permettre au layout de s'afficher
    }

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

  } catch (criticalError) {
    console.error('💥 [LAYOUT TEACHER] - Erreur critique dans le layout:', criticalError);
    
    // En cas d'erreur critique, on affiche une page d'erreur complète
    return (
      <TeacherLayoutError 
        message="Impossible de charger l'interface professeur. Veuillez vérifier votre connexion et réessayer." 
      />
    );
  }
}