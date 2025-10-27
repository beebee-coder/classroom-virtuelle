// src/app/teacher/layout.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getTasksForProfessorValidation } from '@/lib/actions/teacher.actions';
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
    const classrooms = await prisma.classroom.findMany({
      where: { professeurId: session.user.id },
      select: { id: true, nom: true },
    });

    const tasksToValidate = await getTasksForProfessorValidation(session.user.id);
    const validationCount = tasksToValidate.length;
    const firstClassroomId = classrooms.length > 0 ? classrooms[0].id : null;

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
    console.error("❌ Erreur dans le layout enseignant:", error);
    return (
      <div>
        <h1>Erreur de chargement</h1>
        <p>Impossible de charger les données nécessaires pour le layout.</p>
      </div>
    );
  }
}
