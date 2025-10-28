// src/app/teacher/layout.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import TeacherLayoutClient from './TeacherLayoutClient';

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

    // CORRECTION: Simplifier les requêtes pour éviter les dépendances circulaires
    const classrooms = await prisma.classroom.findMany({
      where: { professeurId: session.user.id },
      select: { id: true, nom: true },
    });

    // CORRECTION: Calculer le nombre de validations directement ici
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
      <TeacherLayoutClient
        user={session.user}
        classrooms={classrooms}
        validationCount={validationCount}
        firstClassroomId={firstClassroomId}
      >
        {children}
      </TeacherLayoutClient>
    );

  } catch (error) {
    console.error("❌ [LAYOUT] Erreur dans le layout enseignant:", error);
    
    // Fallback simple sans dépendances
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">
            Erreur de chargement
          </h1>
          <p className="text-muted-foreground mb-6">
            Impossible de charger les données du layout enseignant.
          </p>
          <a 
            href="/teacher/dashboard" 
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors inline-block"
          >
            Retour au tableau de bord
          </a>
        </div>
      </div>
    );
  }
}