// src/app/teacher/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth';
import { getTeacherDashboardData } from '@/lib/teacher-data';
import TeacherDashboardClient from './TeacherDashboardClient';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

function TeacherDashboardSkeleton() {
    return <div>Chargement du tableau de bord...</div>;
}

export default async function TeacherDashboardPage() {
  const session = await getAuthSession();

  if (!session?.user || session.user.role !== 'PROFESSEUR') {
    redirect('/login');
  }

  try {
    const { classrooms, tasksToValidateCount, pendingStudentCount } = await getTeacherDashboardData(session.user.id);

    return (
      <Suspense fallback={<TeacherDashboardSkeleton />}>
        <div 
          className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-w-0" 
          role="main"
        >
          <TeacherDashboardClient
            user={session.user}
            classrooms={classrooms}
            initialTasksCount={tasksToValidateCount}
            initialStudentsCount={pendingStudentCount}
          />
        </div>
      </Suspense>
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
}