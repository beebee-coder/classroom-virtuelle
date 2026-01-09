// src/lib/teacher-data.ts
import prisma from '@/lib/prisma';
import { Role, ValidationStatus } from '@prisma/client';

export async function getTeacherDashboardData(professeurId: string) {
  if (!professeurId) {
    throw new Error("L'ID du professeur est requis.");
  }

  const [classrooms, tasksToValidateCount, pendingStudentCount] = await Promise.all([
    prisma.classroom.findMany({
      where: { professeurId },
      select: { id: true, nom: true },
      orderBy: { nom: 'asc' },
    }),
    prisma.studentProgress.count({
      where: {
        status: 'PENDING_VALIDATION',
        task: { validationType: 'PROFESSOR' },
        student: { classe: { professeurId } },
      },
    }),
    prisma.user.count({
      where: {
        role: Role.ELEVE,
        validationStatus: ValidationStatus.PENDING,
      }
    })
  ]);

  return {
    classrooms,
    tasksToValidateCount,
    pendingStudentCount,
    validationCount: tasksToValidateCount + pendingStudentCount,
  };
}
