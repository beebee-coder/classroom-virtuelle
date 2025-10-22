
// src/lib/actions/teacher.actions.ts
'use server';

import prisma from '@/lib/prisma';
import { getAuthSession } from '../session';
import { pusherServer } from '../pusher/server';
import { revalidatePath } from 'next/cache';
import { ProgressStatus, ValidationType, Role } from '@prisma/client';
import type { TaskForProfessorValidation } from '../types';
import { startOfDay, startOfWeek, isMonday, isFirstDayOfMonth } from 'date-fns';

export async function endAllActiveSessionsForTeacher() {
  const session = await getAuthSession();
  if (session?.user.role !== 'PROFESSEUR') {
    throw new Error('Unauthorized: Only teachers can end sessions.');
  }

  const activeSessions = await prisma.coursSession.findMany({
    where: {
      professeurId: session.user.id,
      endedAt: null,
    },
    include: {
      participants: {
        select: { id: true, classroomId: true },
      },
    },
  });

  if (activeSessions.length === 0) {
    return; // Nothing to do
  }

  console.log(`[Action] Le prof ${session.user.id} termine ${activeSessions.length} session(s) active(s).`);

  // End all sessions in a transaction
  await prisma.coursSession.updateMany({
    where: {
      id: {
        in: activeSessions.map((s) => s.id),
      },
    },
    data: {
      endedAt: new Date(),
    },
  });

  // Trigger Pusher events and revalidate paths for each ended session
  for (const endedSession of activeSessions) {
    const firstParticipant = endedSession.participants[0];
    // Notify clients on the class channel
    if (firstParticipant?.classroomId) {
      const channelName = `presence-classe-${firstParticipant.classroomId}`;
      await pusherServer.trigger(channelName, 'session-ended', { sessionId: endedSession.id });
    }
    // Also notify clients on the specific session channel
    const sessionChannelName = `presence-session-${endedSession.id}`;
    await pusherServer.trigger(sessionChannelName, 'session-ended', { sessionId: endedSession.id });

    // Revalidate participant pages
    endedSession.participants.forEach(p => revalidatePath(`/student/${p.id}`));
  }
  
  revalidatePath('/teacher');
}

export async function endAllActiveSessionsAndHideCardForTeacher() {
    const session = await getAuthSession();
    if (session?.user.role !== 'PROFESSEUR') {
        throw new Error('Unauthorized');
    }

    // 1. End all active sessions
    await endAllActiveSessionsForTeacher();

    // 2. Broadcast event to hide the card on all clients
    const classrooms = await prisma.classroom.findMany({
        where: { professeurId: session.user.id },
        select: { id: true },
    });

    const events = classrooms.map(classroom => ({
        channel: `presence-classe-${classroom.id}`,
        name: 'card-trigger',
        data: { isActive: false }
    }));
    
    if (events.length > 0) {
        await pusherServer.triggerBatch(events);
    }

    return { success: true };
}


export async function getTasksForProfessorValidation(teacherId: string): Promise<TaskForProfessorValidation[]> {
    const tasks = await prisma.studentProgress.findMany({
        where: {
            status: ProgressStatus.PENDING_VALIDATION,
            task: {
                validationType: ValidationType.PROFESSOR,
            },
            student: {
                classe: {
                    professeurId: teacherId
                }
            }
        },
        include: {
            task: true,
            student: {
                select: {
                    id: true,
                    name: true,
                }
            }
        },
        orderBy: {
            completionDate: 'asc'
        }
    });
    return tasks as TaskForProfessorValidation[];
}

export interface ProfessorValidationPayload {
    progressId: string;
    approved: boolean;
    pointsAwarded?: number;
    rejectionReason?: string;
}

export async function validateTaskByProfessor(payload: ProfessorValidationPayload) {
    const session = await getAuthSession();
    if (session?.user.role !== 'PROFESSEUR') {
        throw new Error('Unauthorized');
    }

    const progress = await prisma.studentProgress.findUnique({
        where: { id: payload.progressId },
        include: { 
            task: true,
            student: {
                select: { id: true, name: true, classroomId: true }
            }
        },
    });

    if (!progress || progress.task.validationType !== 'PROFESSOR' || progress.status !== 'PENDING_VALIDATION') {
        throw new Error('Tâche non trouvée ou validation incorrecte.');
    }

    if (payload.approved) {
        const pointsAwarded = payload.pointsAwarded ?? progress.task.points;
        await prisma.$transaction([
            prisma.studentProgress.update({
                where: { id: payload.progressId },
                data: { 
                    status: ProgressStatus.VERIFIED,
                    pointsAwarded: pointsAwarded
                },
            }),
            prisma.user.update({
                where: { id: progress.studentId },
                data: { points: { increment: pointsAwarded } },
            }),
            prisma.leaderboard.upsert({
                where: { studentId: progress.studentId },
                update: {
                    totalPoints: { increment: pointsAwarded },
                    dailyPoints: { increment: pointsAwarded },
                    weeklyPoints: { increment: pointsAwarded },
                    monthlyPoints: { increment: pointsAwarded },
                    completedTasks: { increment: 1 },
                },
                create: {
                    studentId: progress.studentId,
                    totalPoints: pointsAwarded,
                    dailyPoints: pointsAwarded,
                    weeklyPoints: pointsAwarded,
                    monthlyPoints: pointsAwarded,
                    completedTasks: 1,
                    rank: 0,
                    currentStreak: 1,
                    bestStreak: 1,
                },
            }),
        ]);

        revalidatePath(`/student/${progress.studentId}`);
        revalidatePath('/teacher/validations');

        return {
            studentName: progress.student.name ?? 'l\'élève',
            taskTitle: progress.task.title,
            pointsAwarded: pointsAwarded,
        };

    } else {
        await prisma.studentProgress.update({
            where: { id: payload.progressId },
            data: { status: ProgressStatus.NOT_STARTED }, // Student can retry
        });
        
        revalidatePath(`/student/${progress.studentId}`);
        revalidatePath('/teacher/validations');

        return {
            studentName: progress.student.name ?? 'l\'élève',
            taskTitle: progress.task.title,
            pointsAwarded: 0,
        };
    }
}

export async function resetAllStudentData() {
  const session = await getAuthSession();
  if (session?.user.role !== Role.PROFESSEUR) {
    throw new Error("Seuls les professeurs peuvent réinitialiser les données.");
  }

  try {
    await prisma.$transaction([
      // 1. Supprimer toutes les entrées de progression
      prisma.studentProgress.deleteMany(),
      // 2. Supprimer toutes les entrées de classement
      prisma.leaderboard.deleteMany(),
      // 3. Réinitialiser les points de tous les élèves à 0
      prisma.user.updateMany({
        where: { role: Role.ELEVE },
        data: { points: 0 },
      }),
      // Ajoutez ici d'autres suppressions si nécessaire (ex: achievements, messages, etc.)
       prisma.studentAchievement.deleteMany(),
       prisma.message.deleteMany(),
    ]);

    // Revalider les chemins pour que les changements soient visibles
    revalidatePath('/teacher');
    // On pourrait aussi revalider toutes les pages élèves, mais cela peut être lourd.
    // Un rechargement côté client suffira souvent.

    return { success: true, message: "Toutes les données des élèves ont été réinitialisées." };
  } catch (error) {
    console.error("Erreur lors de la réinitialisation des données :", error);
    if (error instanceof Error) {
        throw new Error(`Échec de la réinitialisation : ${error.message}`);
    }
    throw new Error("Une erreur inconnue est survenue lors de la réinitialisation.");
  }
}

export async function resetPeriodicData() {
  const session = await getAuthSession();
  if (session?.user.role !== Role.PROFESSEUR) {
      throw new Error("Seuls les professeurs peuvent lancer cette action.");
  }

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const startOfYesterday = startOfDay(yesterday);
  const startOfToday = startOfDay(today);

  // Logique pour la mise à jour des classements
  const leaderboardUpdateData: any = {
      dailyPoints: 0,
  };

  if (isMonday(today)) {
      leaderboardUpdateData.weeklyPoints = 0;
  }
  if (isFirstDayOfMonth(today)) {
      leaderboardUpdateData.monthlyPoints = 0;
  }
  
  await prisma.leaderboard.updateMany({
      data: leaderboardUpdateData,
  });

  // Logique pour la mise à jour des séries (streaks)
  const students = await prisma.user.findMany({
      where: { role: 'ELEVE' },
      select: { id: true }
  });

  for (const student of students) {
      const lastCompletedTask = await prisma.studentProgress.findFirst({
          where: {
              studentId: student.id,
              status: { in: [ProgressStatus.COMPLETED, ProgressStatus.VERIFIED] },
              completionDate: {
                  gte: startOfYesterday,
                  lt: startOfToday,
              }
          }
      });
      
      if (!lastCompletedTask) {
          // Si aucune tâche n'a été complétée hier, réinitialiser la série
          await prisma.leaderboard.updateMany({
              where: { studentId: student.id },
              data: { currentStreak: 0 }
          });
      }
  }
  
  revalidatePath('/teacher');

  return { success: true, message: "La maintenance périodique a été effectuée." };
}
