// src/lib/actions/task.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '../prisma';
import redis from '../redis';
import { ProgressStatus, type Task, type StudentProgress, Role } from '@prisma/client';

const TASKS_CACHE_KEY = 'tasks:all';
const STUDENT_PROGRESS_CACHE_KEY = (studentId: string) => `student-progress:${studentId}`;
const STUDENT_DATA_CACHE_KEY = (id: string) => `student:${id}`;

// Fonction pour invalider les caches liés aux tâches
async function invalidateTaskCaches(studentId?: string) {
    if (redis) {
      try {
        const pipeline = redis.pipeline();
        pipeline.del(TASKS_CACHE_KEY);
        if (studentId) {
            pipeline.del(STUDENT_PROGRESS_CACHE_KEY(studentId));
            pipeline.del(STUDENT_DATA_CACHE_KEY(studentId));
        }
        await pipeline.exec();
        console.log(`🔄 Cache Redis pour les tâches (et élève ${studentId}) invalidé.`);
      } catch(e) {
        console.error('Erreur lors de l\'invalidation du cache des tâches :', e);
      }
    }
}

export async function saveTask(formData: FormData): Promise<Task> {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'PROFESSEUR') {
        throw new Error('Unauthorized');
    }

    const taskId = formData.get('id') as string | null;

    const taskData = {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        points: parseInt(formData.get('points') as string, 10),
        type: formData.get('type') as any,
        category: formData.get('category') as any,
        difficulty: formData.get('difficulty') as any,
        validationType: formData.get('validationType') as any,
        requiresProof: formData.get('requiresProof') === 'on',
    };

    let savedTask: Task;

    if (taskId) {
        console.log(`📝 [ACTION] Mise à jour de la tâche ID: ${taskId}`);
        savedTask = await prisma.task.update({
            where: { id: taskId },
            data: taskData,
        });
    } else {
        console.log(`📝 [ACTION] Création d'une nouvelle tâche`);
        savedTask = await prisma.task.create({ data: taskData });
    }

    await invalidateTaskCaches();
    revalidatePath('/teacher/tasks');
    revalidatePath('/student/dashboard', 'layout'); // Pour tous les élèves
    return savedTask;
}


export async function deleteTask(id: string): Promise<{ success: boolean }> {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'PROFESSEUR') {
        throw new Error('Unauthorized');
    }

    await prisma.task.delete({ where: { id: id } });

    await invalidateTaskCaches();
    revalidatePath('/teacher/tasks');
    revalidatePath('/student/dashboard', 'layout');
    return { success: true };
}

export async function completeTask(taskId: string, submissionUrl?: string): Promise<StudentProgress> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || session.user.role !== Role.ELEVE) {
    throw new Error("Authentification élève requise.");
  }
  const studentId = session.user.id;

  const existingProgress = await prisma.studentProgress.findFirst({
      where: { studentId, taskId }
  });

  const taskData = await prisma.task.findUnique({ where: { id: taskId } });
  if (!taskData) {
      throw new Error("Tâche non trouvée.");
  }
  
  let newStatus: ProgressStatus;
  if (taskData.validationType === 'AUTOMATIC') {
    newStatus = ProgressStatus.VERIFIED;
  } else {
    newStatus = ProgressStatus.PENDING_VALIDATION;
  }

  let progress;

  if (existingProgress) {
      progress = await prisma.studentProgress.update({
          where: { id: existingProgress.id },
          data: {
              status: newStatus,
              submissionUrl: submissionUrl,
              completionDate: new Date(),
          }
      });
  } else {
      progress = await prisma.studentProgress.create({
          data: {
              studentId,
              taskId,
              status: newStatus,
              submissionUrl: submissionUrl,
          }
      });
  }

  if (newStatus === ProgressStatus.VERIFIED) {
    await prisma.user.update({
        where: { id: studentId },
        data: { points: { increment: taskData.points } }
    });
  }
  
  await invalidateTaskCaches(studentId);

  revalidatePath(`/student/dashboard`);
  if (taskData.validationType === 'PROFESSOR') {
      revalidatePath('/teacher/validations');
  }
  if (taskData.validationType === 'PARENT') {
      revalidatePath(`/student/${studentId}/parent`);
  }

  return progress;
}
