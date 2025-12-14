// src/app/teacher/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getTasksForProfessorValidation } from '@/lib/actions/teacher.actions';
import prisma from '@/lib/prisma';
import TeacherDashboardClient from './TeacherDashboardClient';
import type { Classroom } from '@prisma/client';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

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
      // ✅ Ajout de role="main" pour accessibilité
      <div 
        className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-w-0" 
        role="main"
      >
        <TeacherDashboardClient
          user={session.user}
          classrooms={classroomsData}
          validationCount={validationCount}
        />
      </div>
    );

  } catch (error) {
    console.error("❌ [DASHBOARD] Erreur lors du chargement du tableau de bord:", error);
    
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
            Impossible de charger les données du tableau de bord. Veuillez réessayer plus tard.
          </p>
          {/* ✅ Utilisation de Button pour cohérence UX */}
          <Button asChild>
            <Link href="/teacher/dashboard">
              Réessayer
            </Link>
          </Button>
        </div>
      </div>
    );
  }
}