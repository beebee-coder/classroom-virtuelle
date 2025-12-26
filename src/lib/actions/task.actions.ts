// src/lib/actions/task.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { getAuthSession } from "@/lib/auth";
import prisma from '../prisma';
import { ProgressStatus, type Task, type StudentProgress, Role } from '@prisma/client';


// Fonction pour invalider les caches liés aux tâches
async function invalidateTaskCaches(studentId?: string) {
    console.log(`🔄 Cache pour les tâches (et élève ${studentId || 'aucun'}) invalidé.`);
}

export async function saveTask(formData: FormData): Promise<Task> {
    console.log(`📝 [ACTION] saveTask`);
    const session = await getAuthSession();
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
        console.log(`  -> Mise à jour de la tâche ID: ${taskId}`);
        savedTask = await prisma.task.update({
            where: { id: taskId },
            data: taskData,
        });
    } else {
        console.log(`  -> Création d'une nouvelle tâche`);
        savedTask = await prisma.task.create({ data: taskData });
    }

    await invalidateTaskCaches();
    revalidatePath('/teacher/tasks');
    revalidatePath('/student/dashboard', 'layout'); // Pour tous les élèves
    console.log(`✅ [ACTION] Tâche sauvegardée avec succès: ${savedTask.id}`);
    return savedTask;
}


export async function deleteTask(id: string): Promise<{ success: boolean }> {
    console.log(`🗑️ [ACTION] deleteTask: ${id}`);
    const session = await getAuthSession();
    if (session?.user?.role !== 'PROFESSEUR') {
        throw new Error('Unauthorized');
    }

    await prisma.task.delete({ where: { id: id } });

    await invalidateTaskCaches();
    revalidatePath('/teacher/tasks');
    revalidatePath('/student/dashboard', 'layout');
    console.log(`✅ [ACTION] Tâche supprimée avec succès: ${id}`);
    return { success: true };
}

export async function completeTask(taskId: string, submissionUrl?: string): Promise<StudentProgress> {
  console.log(`🏁 [ACTION] completeTask: ${taskId}`);
  const session = await getAuthSession();
  
  if (!session?.user || session.user.role !== Role.ELEVE) {
    throw new Error("Authentification élève requise.");
  }
  const studentId = session.user.id;
  console.log(`  -> par l'élève: ${studentId}`);

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
  console.log(`  -> Nouveau statut: ${newStatus}`);

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
    console.log(`  -> Tâche auto-validée. +${taskData.points} points pour ${studentId}.`);
  }
  
  await invalidateTaskCaches(studentId);

  revalidatePath(`/student/dashboard`);
  if (taskData.validationType === 'PROFESSOR') {
      revalidatePath('/teacher/validations');
  }
  if (taskData.validationType === 'PARENT') {
      revalidatePath(`/student/${studentId}/parent`);
  }
  
  console.log(`✅ [ACTION] Tâche complétée avec succès: ${progress.id}`);
  return progress;
}

export async function getActiveTasks(): Promise<Task[]> {
    console.log('📋 [ACTION] getActiveTasks');
    const tasks = await prisma.task.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
    });
    console.log(`  -> ${tasks.length} tâches actives trouvées.`);
    return tasks;
}
