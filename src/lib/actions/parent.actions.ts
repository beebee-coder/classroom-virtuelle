// src/lib/actions/parent.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import prisma from '../prisma';
import { Prisma } from '@prisma/client';
import type { Task, StudentProgress, User } from '@prisma/client';
import { ProgressStatus } from '@prisma/client';

type DetailedFeedback = { taste: number, presentation: number, autonomy: number, comment: string };

export async function setParentPassword(studentId: string, password: string) {
    console.log(`🔐 [ACTION] Définition du mot de passe parental pour l'élève ${studentId}`);
    if (password.length < 4) {
        throw new Error("Le mot de passe doit contenir au moins 4 caractères.");
    }
    await prisma.user.update({
        where: { id: studentId, role: 'ELEVE' },
        data: { parentPassword: password } // Note: Dans une vraie app, il faudrait hasher ce mot de passe.
    });
    revalidatePath(`/student/${studentId}/parent`);
}

export async function verifyParentPassword(studentId: string, password: string): Promise<boolean> {
    console.log(`🔐 [ACTION] Vérification du mot de passe parental pour l'élève ${studentId}`);
    const student = await prisma.user.findUnique({
        where: { id: studentId }
    });
    if (!student || !student.parentPassword) return false;
    return student.parentPassword === password;
}

export async function getTasksForValidation(studentId: string): Promise<(Task & { progressId: string })[]> {
    console.log(`👀 [ACTION] Récupération des tâches pour validation parentale pour l'élève ${studentId}`);
    
    const progressEntries = await prisma.studentProgress.findMany({
        where: {
            studentId: studentId,
            status: ProgressStatus.PENDING_VALIDATION,
            task: {
                validationType: 'PARENT'
            }
        },
        include: {
            task: true
        }
    });

    // Transformer les données pour correspondre au type de retour attendu
    return progressEntries.map(p => ({
        ...p.task,
        progressId: p.id,
    }));
}


export async function validateTaskByParent(
    progressId: string,
    approved: boolean,
    feedback?: DetailedFeedback,
    recipeName?: string,
) {
  console.log(`👍 [ACTION] Validation parentale pour la progression ${progressId}`, { approved, feedback, recipeName });
  const progress = await prisma.studentProgress.findUnique({
    where: { id: progressId },
    include: { task: true, student: true }
  });

  if (!progress) {
    throw new Error("Progression de tâche non trouvée.");
  }
  
  const studentId = progress.studentId;

  if (approved) {
    const finalPoints = progress.task.points;
    await prisma.$transaction([
      prisma.studentProgress.update({
        where: { id: progressId },
        data: {
          status: ProgressStatus.VERIFIED,
          pointsAwarded: finalPoints,
          feedback: feedback ? JSON.stringify(feedback) : Prisma.JsonNull,
          recipeName: recipeName || null
        }
      }),
      prisma.user.update({
        where: { id: studentId },
        data: { points: { increment: finalPoints } }
      })
    ]);
  } else {
    await prisma.studentProgress.update({
      where: { id: progressId },
      data: { status: ProgressStatus.REJECTED }
    });
  }

  revalidatePath(`/student/${studentId}/parent`);
  revalidatePath(`/student/dashboard`);
  revalidatePath(`/student/${studentId}`);
  
  return { pointsAwarded: approved ? progress.task.points : 0 };
}
