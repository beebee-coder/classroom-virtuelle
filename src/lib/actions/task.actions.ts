// src/lib/actions/task.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { getAuthSession } from '../session';
import prisma from '../prisma';
import { ProgressStatus, type Task, type StudentProgress, Role } from '@prisma/client';

export async function createTask(formData: FormData): Promise<Task> {
    const session = await getAuthSession();
    if (session?.user?.role !== 'PROFESSEUR') {
        throw new Error('Unauthorized');
    }
    
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

    const newTask = await prisma.task.create({ data: taskData });

    revalidatePath('/teacher/tasks');
    return newTask;
}

export async function updateTask(formData: FormData): Promise<Task> {
    const session = await getAuthSession();
    if (session?.user?.role !== 'PROFESSEUR') {
        throw new Error('Unauthorized');
    }

    const taskId = formData.get('id') as string;
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

    const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: taskData,
    });

    revalidatePath('/teacher/tasks');
    return updatedTask;
}

export async function deleteTask(id: string): Promise<{ success: boolean }> {
    const session = await getAuthSession();
    if (session?.user?.role !== 'PROFESSEUR') {
        throw new Error('Unauthorized');
    }

    await prisma.task.delete({ where: { id } });

    revalidatePath('/teacher/tasks');
    return { success: true };
}

export async function completeTask(taskId: string, submissionUrl?: string): Promise<StudentProgress> {
  const session = await getAuthSession();
  
  if (!session?.user || session.user.role !== Role.ELEVE) {
    throw new Error("Authentification élève requise.");
  }
  const studentId = session.user.id;


  // Vérifier si une progression existe déjà (pour les tâches rejetées)
  const existingProgress = await prisma.studentProgress.findFirst({
      where: {
          studentId,
          taskId,
      }
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
      // Mettre à jour la progression existante (cas d'une tâche rejetée qu'on resoumet)
      progress = await prisma.studentProgress.update({
          where: { id: existingProgress.id },
          data: {
              status: newStatus,
              submissionUrl: submissionUrl, // Mettre à jour la preuve
              completionDate: new Date(),
          }
      });
  } else {
      // Créer une nouvelle entrée de progression
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
  
  revalidatePath(`/student/dashboard`);
  if (taskData.validationType === 'PROFESSOR') {
      revalidatePath('/teacher/validations');
  }
  if (taskData.validationType === 'PARENT') {
      revalidatePath(`/student/${studentId}/parent`);
  }

  return progress;
}
