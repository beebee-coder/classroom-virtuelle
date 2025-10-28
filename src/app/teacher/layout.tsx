// src/app/teacher/layout.tsx
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import TeacherLayoutClient from './TeacherLayoutClient';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

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
    
    // Fallback simple sans dépendances pour éviter les plantages en cascade
    return (
      <div className="min-h-screen flex items-center justify-center bg-background ">
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
