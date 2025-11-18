
// src/app/teacher/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getTasksForProfessorValidation } from '@/lib/actions/teacher.actions';
import prisma from '@/lib/prisma';
import TeacherDashboardClient from './TeacherDashboardClient';
import type { Classroom } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function TeacherDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== 'PROFESSEUR') {
    redirect('/login');
  }

  try {
    console.log(`👨‍🏫 [DASHBOARD] Chargement du tableau de bord pour le professeur: ${session.user.id}`);

    const classroomsData = await prisma.classroom.findMany({
      where: { 
        professeurId: session.user.id
      },
      select: { 
        id: true, 
        nom: true 
      },
    });

    console.log(`📚 [DASHBOARD] ${classroomsData.length} classes trouvées`);

    const tasksToValidate = await getTasksForProfessorValidation(session.user.id);
    const validationCount = tasksToValidate.length;
    
    console.log(`✅ [DASHBOARD] ${validationCount} tâches à valider`);

    return (
      <TeacherDashboardClient
        user={session.user}
        classrooms={classroomsData}
        validationCount={validationCount}
      />
    );

  } catch (error) {
    console.error("❌ [DASHBOARD] Erreur lors du chargement du tableau de bord:", error);
    
    return (
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-destructive mb-4">
          Erreur de chargement
        </h1>
        <p className="text-muted-foreground mb-6">
          Impossible de charger les données du tableau de bord. Veuillez réessayer plus tard.
        </p>
        <a 
          href="/teacher/dashboard" 
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors inline-block"
        >
          Réessayer
        </a>
      </div>
    );
  }
}

    