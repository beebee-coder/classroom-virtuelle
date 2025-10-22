// src/lib/actions/task.actions.ts
'use server';

import prisma from '@/lib/prisma';
import { getAuthSession } from '@/lib/session';
import { revalidatePath } from 'next/cache';
import { startOfDay, startOfWeek, startOfMonth, isAfter } from 'date-fns';
import { Task, TaskCategory, TaskDifficulty, TaskType, ProgressStatus, ValidationType } from '@prisma/client';

async function verifyTeacher() {
  const session = await getAuthSession();
  if (session?.user.role !== 'PROFESSEUR') {
    throw new Error('Unauthorized');
  }
}

export async function createTask(formData: FormData): Promise<Task[]> {
  await verifyTeacher();
  
  const data = {
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    points: parseInt(formData.get('points') as string, 10),
    type: formData.get('type') as TaskType,
    category: formData.get('category') as TaskCategory,
    difficulty: formData.get('difficulty') as TaskDifficulty,
    attachmentUrl: formData.get('attachmentUrl') as string | null,
    validationType: formData.get('validationType') as ValidationType,
    requiresProof: formData.get('requiresProof') === 'true',
    duration: 1, // default duration
    isActive: true, // default active
  };

  if (!data.title || !data.description || isNaN(data.points)) {
    throw new Error('Invalid data');
  }

  await prisma.task.create({ data });
  
  revalidatePath('/teacher/tasks');
  return prisma.task.findMany({ orderBy: { type: 'asc' } });
}

export async function updateTask(formData: FormData): Promise<Task[]> {
  await verifyTeacher();

  const id = formData.get('id') as string;
  const data = {
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    points: parseInt(formData.get('points') as string, 10),
    type: formData.get('type') as TaskType,
    category: formData.get('category') as TaskCategory,
    difficulty: formData.get('difficulty') as TaskDifficulty,
    attachmentUrl: formData.get('attachmentUrl') as string | null,
    validationType: formData.get('validationType') as ValidationType,
    requiresProof: formData.get('requiresProof') === 'true',
  };

  if (!id || !data.title || !data.description || isNaN(data.points)) {
    throw new Error('Invalid data');
  }
  
  await prisma.task.update({ where: { id }, data });

  revalidatePath('/teacher/tasks');
  return prisma.task.findMany({ orderBy: { type: 'asc' } });
}

export async function deleteTask(id: string): Promise<Task[]> {
    await verifyTeacher();
    
    // First, delete related student progress to avoid foreign key constraint errors
    await prisma.studentProgress.deleteMany({
        where: { taskId: id },
    });

    await prisma.task.delete({
        where: { id },
    });

    revalidatePath('/teacher/tasks');
    return prisma.task.findMany({ orderBy: { type: 'asc' } });
}


export async function completeTask(taskId: string, submissionUrl?: string) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== 'ELEVE') {
    throw new Error('Unauthorized');
  }
  const userId = session.user.id;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    throw new Error('Task not found');
  }
  
  const validationType = task.validationType;
  
  // **SECURITY FIX**: Prevent manual validation of time-based or system-action tasks
  if (task.startTime) {
    throw new Error("Cette tâche est validée automatiquement par le système et ne peut pas être complétée manuellement.");
  }

  // Check if task requires proof and if it was provided
  if (task.requiresProof && !submissionUrl) {
    // Exception for PARENT validation: they don't submit proof, they request validation
    if (validationType !== ValidationType.PARENT) {
      throw new Error('Une preuve est requise pour cette tâche.');
    }
  }

  // Check if task is already completed or pending within the valid period
  const now = new Date();
  let periodStart: Date;

  switch (task.type) {
    case 'DAILY': periodStart = startOfDay(now); break;
    case 'WEEKLY': periodStart = startOfWeek(now, { weekStartsOn: 1 }); break;
    case 'MONTHLY': periodStart = startOfMonth(now); break;
    default: periodStart = new Date(0); break;
  }

  const existingProgress = await prisma.studentProgress.findFirst({
    where: {
      studentId: userId,
      taskId,
      status: { in: ['COMPLETED', 'VERIFIED', 'PENDING_VALIDATION'] },
      completionDate: { gte: periodStart },
    },
  });

  if (existingProgress) {
    throw new Error('Tâche déjà accomplie ou en attente de validation pour cette période.');
  }

  
  const isAutomaticValidation = validationType === ValidationType.AUTOMATIC;
  
  const finalStatus = isAutomaticValidation
    ? ProgressStatus.COMPLETED
    : ProgressStatus.PENDING_VALIDATION;

  let pointsAwarded = 0;
  
  const newProgress = await prisma.$transaction(async (tx) => {
      // Create the progress entry first
      const createdProgress = await tx.studentProgress.create({
        data: {
          studentId: userId,
          taskId,
          status: finalStatus,
          completionDate: new Date(),
          submissionUrl,
          pointsAwarded: 0, // Points are awarded upon validation
        },
        include: {
          task: true,
        }
      });
      
      // If validation is automatic, award points immediately.
      if (isAutomaticValidation) {
          pointsAwarded = task.points;
          
          // Update the user's total points
          const updatedUser = await tx.user.update({
            where: { id: userId },
            data: { points: { increment: pointsAwarded } },
          });

          // Upsert the leaderboard entry
          await tx.leaderboard.upsert({
            where: { studentId: userId },
            update: { 
              totalPoints: { increment: pointsAwarded },
              dailyPoints: { increment: pointsAwarded },
              weeklyPoints: { increment: pointsAwarded },
              monthlyPoints: { increment: pointsAwarded },
              completedTasks: { increment: 1 },
            },
            create: {
              studentId: userId,
              totalPoints: pointsAwarded,
              dailyPoints: pointsAwarded,
              weeklyPoints: pointsAwarded,
              monthlyPoints: pointsAwarded,
              completedTasks: 1,
              rank: 0,
              currentStreak: 1,
              bestStreak: 1,
            }
          });
          
          // Update the points on the progress entry itself
          return tx.studentProgress.update({
              where: { id: createdProgress.id },
              data: { pointsAwarded },
              include: { task: true }
          });
      }

      return createdProgress;
  });


  revalidatePath(`/student/${userId}`);

  return newProgress;
}
