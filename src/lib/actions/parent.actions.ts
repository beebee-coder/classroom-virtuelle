// src/lib/actions/parent.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import prisma from '../prisma';
import { Prisma } from '@prisma/client';
import type { Task, StudentProgress, User } from '@prisma/client';
import { ProgressStatus } from '@prisma/client';

type DetailedFeedback = { taste: number, presentation: number, autonomy: number, comment: string };

export async function setParentPassword(studentId: string, password: string) {
    console.log(`🔐 [ACTION] setParentPassword pour l'élève: ${studentId}`);
    if (password.length < 4) {
        throw new Error("Le mot de passe doit contenir au moins 4 caractères.");
    }
    await prisma.user.update({
        where: { id: studentId, role: 'ELEVE' },
        data: { parentPassword: password } // Note: Dans une vraie app, il faudrait hasher ce mot de passe.
    });
    revalidatePath(`/student/${studentId}/parent`);
    console.log(`✅ [ACTION] Mot de passe parental défini pour ${studentId}`);
}

export async function verifyParentPassword(studentId: string, password: string): Promise<boolean> {
    console.log(`🔐 [ACTION] verifyParentPassword pour l'élève: ${studentId}`);
    const student = await prisma.user.findUnique({
        where: { id: studentId }
    });
    if (!student || !student.parentPassword) {
        console.log(`  -> Échec: élève ou mot de passe non trouvé.`);
        return false;
    }
    const isValid = student.parentPassword === password;
    console.log(`  -> Résultat vérification: ${isValid}`);
    return isValid;
}

export async function getTasksForValidation(studentId: string): Promise<(Task & { progressId: string })[]> {
    console.log(`👀 [ACTION] getTasksForValidation (parent) pour l'élève: ${studentId}`);
    
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

    console.log(`  -> ${progressEntries.length} tâche(s) trouvée(s).`);
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
  console.log(`👍 [ACTION] validateTaskByParent pour la progression: ${progressId}`, { approved, feedback, recipeName });
  const progress = await prisma.studentProgress.findUnique({
    where: { id: progressId },
    include: { task: true, student: true }
  });

  if (!progress) {
    console.error(`❌ [ACTION] Progression non trouvée: ${progressId}`);
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
    console.log(`  -> Tâche approuvée. +${finalPoints} points pour ${studentId}.`);
  } else {
    await prisma.studentProgress.update({
      where: { id: progressId },
      data: { status: ProgressStatus.REJECTED }
    });
    console.log(`  -> Tâche rejetée.`);
  }

  revalidatePath(`/student/${studentId}/parent`);
  revalidatePath(`/student/dashboard`);
  revalidatePath(`/student/${studentId}`);
  
  console.log(`✅ [ACTION] Validation parentale terminée pour ${progressId}.`);
  return { pointsAwarded: approved ? progress.task.points : 0 };
}
