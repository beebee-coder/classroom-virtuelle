// src/lib/actions/parent.actions.ts
'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcrypt';
import { ProgressStatus, Task } from '@prisma/client';

const SALT_ROUNDS = 10;

type DetailedFeedback = { taste: number, presentation: number, autonomy: number, comment: string };

export async function setParentPassword(studentId: string, password: string) {
  if (password.length < 6) {
    throw new Error('Le mot de passe doit faire au moins 6 caractères.');
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: studentId, role: 'ELEVE' },
    data: { parentPassword: hashedPassword },
  });

  revalidatePath(`/student/${studentId}/parent`);
}

export async function verifyParentPassword(studentId: string, password: string): Promise<boolean> {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { parentPassword: true },
  });

  if (!student || !student.parentPassword) {
    return false;
  }

  return bcrypt.compare(password, student.parentPassword);
}

export async function getTasksForValidation(studentId: string): Promise<(Task & { progressId: string })[]> {
  const progress = await prisma.studentProgress.findMany({
    where: {
      studentId: studentId,
      status: ProgressStatus.PENDING_VALIDATION,
    },
    include: {
      task: true,
    },
    orderBy: {
      completionDate: 'desc',
    },
  });

  return progress.map(p => ({ ...p.task, progressId: p.id }));
}

export async function validateTaskByParent(
    progressId: string,
    feedback?: DetailedFeedback | number,
    recipeName?: string,
) {
  const progress = await prisma.studentProgress.findUnique({
    where: { id: progressId },
    include: { task: true, student: true },
  });

  if (!progress || progress.status !== ProgressStatus.PENDING_VALIDATION) {
    throw new Error('Tâche non trouvée ou déjà validée.');
  }
  
  const { task, student } = progress;
  let pointsToAward = task.points;
  let finalScore = 100;
  
  const progressUpdateData: any = {
    status: ProgressStatus.VERIFIED,
    recipeName: recipeName,
  };

  // Detailed feedback for cooking task
  if (typeof feedback === 'object' && 'taste' in feedback) {
    finalScore = Math.round((feedback.taste + feedback.presentation + feedback.autonomy) / 3);
    pointsToAward = Math.round(task.points * (finalScore / 100));

    await prisma.parentFeedback.create({
      data: {
        studentProgressId: progressId,
        studentId: student.id,
        taste: feedback.taste,
        presentation: feedback.presentation,
        autonomy: feedback.autonomy,
        comment: feedback.comment,
      }
    });
    progressUpdateData.accuracy = finalScore;
  } 
  // Simple accuracy feedback for other tasks
  else if (typeof feedback === 'number') {
    finalScore = feedback;
    pointsToAward = Math.round(task.points * (finalScore / 100));
    progressUpdateData.accuracy = finalScore;
  }

  progressUpdateData.pointsAwarded = pointsToAward;

  const [updatedProgress] = await prisma.$transaction([
    prisma.studentProgress.update({
      where: { id: progressId },
      data: progressUpdateData,
    }),
    prisma.user.update({
      where: { id: student.id },
      data: { points: { increment: pointsToAward } },
    }),
    prisma.leaderboard.upsert({
      where: { studentId: student.id },
      update: {
        totalPoints: { increment: pointsToAward },
        dailyPoints: { increment: pointsToAward },
        weeklyPoints: { increment: pointsToAward },
        monthlyPoints: { increment: pointsToAward },
        completedTasks: { increment: 1 },
      },
      create: {
        studentId: student.id,
        totalPoints: pointsToAward,
        dailyPoints: pointsToAward,
        weeklyPoints: pointsToAward,
        monthlyPoints: pointsToAward,
        completedTasks: 1,
        rank: 0,
        currentStreak: 1,
        bestStreak: 1,
      },
    }),
  ]);

  revalidatePath(`/student/${student.id}/parent`);
  revalidatePath(`/student/${student.id}`);

  return { pointsAwarded: updatedProgress.pointsAwarded ?? 0 };
}
