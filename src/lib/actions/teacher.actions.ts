// src/lib/actions/teacher.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import prisma from '../prisma';
import type { StudentProgress, Task, User, Classroom, Metier } from '@prisma/client';
import { ProgressStatus, Role, ValidationStatus } from '@prisma/client';
import { ablyTrigger } from '../ably/triggers';
import { AblyEvents } from '../ably/events';
import { getUserChannelName } from '../ably/channels';

export async function checkOwnerAccountExists(): Promise<boolean> {
  const count = await prisma.user.count({
    where: {
      role: Role.PROFESSEUR,
    },
  });
  return count > 0;
}

export type TaskForProfessorValidation = StudentProgress & {
  task: Task;
  student: Pick<User, 'id' | 'name'>;
};

export interface ProfessorValidationPayload {
    progressId: string;
    approved: boolean;
    pointsAwarded?: number;
    rejectionReason?: string;
}

export async function getTeacherDashboardClassrooms(teacherId: string) {
    return await prisma.classroom.findMany({
        where: { professeurId: teacherId },
        select: { id: true, nom: true },
        orderBy: { nom: 'asc' },
    });
}

export async function getPendingStudentCount() {
    return await prisma.user.count({
        where: {
            role: Role.ELEVE,
            validationStatus: ValidationStatus.PENDING,
        },
    });
}

export async function getTeacherClassrooms(teacherId: string) {
  return await prisma.classroom.findMany({
    where: { professeurId: teacherId },
  });
}

export async function getTeacherClassroomsWithStudentCount(teacherId: string) {
    const classrooms = await prisma.classroom.findMany({
      where: { professeurId: teacherId },
      include: { _count: { select: { eleves: true } } }
    });
    return classrooms.map(classroom => ({
      ...classroom,
      _count: { eleves: classroom._count.eleves }
    }));
}

export async function getTeacherProfileStats(teacherId: string) {
    const classrooms = await prisma.classroom.findMany({
        where: { professeurId: teacherId },
        include: { _count: { select: { eleves: true }}}
    });
    const totalStudents = classrooms.reduce((acc, curr) => acc + curr._count.eleves, 0);

    const sessions = await prisma.coursSession.findMany({
        where: { professeurId: teacherId, endTime: { not: null } }
    });
    const totalSessions = sessions.length;
    const averageDuration = totalSessions > 0
        ? sessions.reduce((acc, s) => {
            if (s.endTime && s.startTime) {
                return acc + (s.endTime.getTime() - s.startTime.getTime());
            }
            return acc;
        }, 0) / totalSessions / 1000 / 60
        : 0;
    
    return {
        totalClassrooms: classrooms.length,
        totalStudents,
        totalSessions,
        averageDuration,
    };
}

export async function getTasksForProfessorValidation(teacherId: string): Promise<TaskForProfessorValidation[]> {
  const classrooms = await prisma.classroom.findMany({
    where: { professeurId: teacherId },
    select: { id: true }
  });
  const classroomIds = classrooms.map(c => c.id);

  const students = await prisma.user.findMany({
    where: { classeId: { in: classroomIds } },
    select: { id: true }
  });
  const studentIds = students.map(s => s.id);

  const tasks = await prisma.studentProgress.findMany({
    where: {
      studentId: { in: studentIds },
      status: ProgressStatus.PENDING_VALIDATION,
      task: {
        validationType: 'PROFESSOR'
      }
    },
    include: {
      task: true,
      student: {
        select: { id: true, name: true }
      }
    },
    orderBy: {
      completionDate: 'asc'
    }
  });
  return tasks;
}

export async function validateTaskByProfessor(payload: ProfessorValidationPayload) {
  const { progressId, approved, pointsAwarded } = payload;
  
  const progress = await prisma.studentProgress.findUnique({
    where: { id: progressId },
    include: { task: true, student: true }
  });

  if (!progress) {
    throw new Error("Progression de tâche non trouvée.");
  }
  
  if (approved) {
    const finalPoints = pointsAwarded ?? progress.task.points;
    await prisma.$transaction([
      prisma.studentProgress.update({
        where: { id: progressId },
        data: {
          status: ProgressStatus.VERIFIED,
          pointsAwarded: finalPoints
        }
      }),
      prisma.user.update({
        where: { id: progress.studentId },
        data: { points: { increment: finalPoints } }
      })
    ]);
  } else {
    await prisma.studentProgress.update({
      where: { id: progressId },
      data: { status: ProgressStatus.REJECTED }
    });
  }

  revalidatePath('/teacher/validations');
  revalidatePath(`/student/dashboard`);
  revalidatePath(`/student/${progress.studentId}`);
  
  return {
    studentName: progress.student.name,
    taskTitle: progress.task.title,
    pointsAwarded: approved ? (pointsAwarded ?? progress.task.points) : 0,
  };
}

export async function getPendingStudents() {
  const students = await prisma.user.findMany({
    where: {
      role: Role.ELEVE,
      OR: [
        { classeId: null },
        { validationStatus: ValidationStatus.PENDING }
      ]
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
  return students;
}

export async function validateStudentRegistration(studentId: string, classeId: string) {
  const classe = await prisma.classroom.findUnique({ 
    where: { id: classeId },
    select: { id: true, nom: true }
  });
  if (!classe) {
    throw new Error("Classe introuvable");
  }

  const updatedStudent = await prisma.user.update({
    where: { id: studentId },
    data: {
      validationStatus: ValidationStatus.VALIDATED,
      classeId: classeId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      classeId: true,
    },
  });

  try {
    await ablyTrigger(
      getUserChannelName(studentId),
      AblyEvents.STUDENT_VALIDATED,
      {
        studentId,
        classeId,
        validationStatus: ValidationStatus.VALIDATED,
      }
    );
  } catch (error) {
    console.error('[TEACHER.ACTIONS] Échec de la notification Ably pour validation élève:', error);
  }

  revalidatePath('/teacher/validations');
  revalidatePath('/teacher/dashboard');
  revalidatePath('/teacher/classes');
  revalidatePath('/student/onboarding');

  return updatedStudent;
}

export async function resetAllStudentData() {
  await prisma.$transaction([
    prisma.user.updateMany({
      where: { role: Role.ELEVE },
      data: { points: 0 }
    }),
    prisma.studentProgress.deleteMany({}),
  ]);

  revalidatePath('/teacher', 'layout');
  revalidatePath('/student', 'layout');
  
  return { success: true, message: "Toutes les données des élèves ont été réinitialisées avec succès." };
}

export async function getMetiers(): Promise<Metier[]> {
    return await prisma.metier.findMany({
        orderBy: {
            nom: 'asc',
        },
    });
}
