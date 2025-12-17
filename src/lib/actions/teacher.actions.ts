// src/lib/actions/teacher.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import prisma from '../prisma';
import type { StudentProgress, Task, User, Classroom } from '@prisma/client';
import { ProgressStatus, Role, ValidationStatus } from '@prisma/client';

// ─── Types pour la validation des tâches ───────────────────────────────────────

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

// ─── 1. Gestion des tâches à valider (EXISTANT) ────────────────────────────────

export async function getTasksForProfessorValidation(teacherId: string): Promise<TaskForProfessorValidation[]> {
  console.log(`🧑‍🏫 [ACTION/TASKS] getTasksForProfessorValidation pour le professeur: ${teacherId}.`);
  
  // 1. Trouver les classes du professeur
  const classrooms = await prisma.classroom.findMany({
    where: { professeurId: teacherId },
    select: { id: true }
  });
  const classroomIds = classrooms.map(c => c.id);
  console.log(`  -> Professeur gère ${classroomIds.length} classe(s).`);

  // 2. Trouver les élèves dans ces classes
  const students = await prisma.user.findMany({
    where: { classeId: { in: classroomIds } },
    select: { id: true }
  });
  const studentIds = students.map(s => s.id);

  // 3. Trouver les soumissions en attente
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
  console.log(`  -> ${tasks.length} tâche(s) trouvée(s) pour validation.`);
  return tasks;
}

export async function validateTaskByProfessor(payload: ProfessorValidationPayload) {
  console.log('👍 [ACTION/TASKS] validateTaskByProfessor:', payload);
  const { progressId, approved, pointsAwarded } = payload;
  
  const progress = await prisma.studentProgress.findUnique({
    where: { id: progressId },
    include: { task: true, student: true }
  });

  if (!progress) {
    console.error(`❌ [ACTION/TASKS] Progression non trouvée: ${progressId}`);
    throw new Error("Progression de tâche non trouvée.");
  }
  
  if (approved) {
    const finalPoints = pointsAwarded ?? progress.task.points;
    console.log(`  -> Approbation. Attribution de ${finalPoints} points à ${progress.student.name}.`);
    
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
    console.log(`  -> Rejet de la tâche.`);
    await prisma.studentProgress.update({
      where: { id: progressId },
      data: { 
        status: ProgressStatus.REJECTED,
      }
    });
  }

  revalidatePath('/teacher/validations');
  revalidatePath(`/student/dashboard`);
  revalidatePath(`/student/${progress.studentId}`);
  
  console.log(`✅ [ACTION/TASKS] Validation terminée pour ${progressId}.`);
  return {
    studentName: progress.student.name,
    taskTitle: progress.task.title,
    pointsAwarded: approved ? (pointsAwarded ?? progress.task.points) : 0,
  };
}

// ─── 2. Gestion des inscriptions d'élèves (NOUVEAU) ────────────────────────────

export async function getPendingStudents() {
  console.log('📥 [ACTION/REGISTRATION] Récupération des élèves en attente de validation...');
  
  const students = await prisma.user.findMany({
    where: {
      role: Role.ELEVE,
      validationStatus: ValidationStatus.PENDING,
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

  console.log(`✅ [ACTION/REGISTRATION] ${students.length} élève(s) en attente trouvés.`);
  return students;
}

export async function validateStudentRegistration(studentId: string, classeId: string) {
  console.log(`✅ [ACTION/REGISTRATION] Validation de l'élève ${studentId} → classe ${classeId}`);

  // Vérifier que la classe existe
  const classe = await prisma.classroom.findUnique({ 
    where: { id: classeId },
    select: { id: true, nom: true }
  });
  if (!classe) {
    console.error(`❌ [ACTION/REGISTRATION] Classe non trouvée: ${classeId}`);
    throw new Error("Classe introuvable");
  }

  // Vérifier que l'élève existe et est en attente
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, email: true, validationStatus: true }
  });
  if (!student || student.validationStatus !== ValidationStatus.PENDING) {
    console.error(`❌ [ACTION/REGISTRATION] Élève non éligible à la validation: ${studentId}`);
    throw new Error("Élève non trouvé ou déjà validé");
  }

  // Mettre à jour l'élève
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

  // Revalider les chemins pertinents
  revalidatePath('/teacher/validations');
  revalidatePath('/teacher/dashboard');
  revalidatePath('/teacher/classes');
  revalidatePath(`/student/validation-pending`); // au cas où

  console.log(`🎉 [ACTION/REGISTRATION] Élève validé : ${updatedStudent.name} → ${classe.nom}`);
  return updatedStudent;
}

// ─── 3. Autres actions (EXISTANT) ──────────────────────────────────────────────

export async function resetAllStudentData() {
  console.log('🔄 [ACTION/RESET] resetAllStudentData - Lancement de la réinitialisation complète.');
  
  await prisma.$transaction([
    prisma.user.updateMany({
      where: { role: Role.ELEVE },
      data: { points: 0 }
    }),
    prisma.studentProgress.deleteMany({}),
  ]);

  console.log("✅ [ACTION/RESET] Toutes les données des élèves ont été réinitialisées.");
  revalidatePath('/teacher', 'layout');
  revalidatePath('/student', 'layout');
  
  return { success: true, message: "Toutes les données des élèves ont été réinitialisées avec succès." };
}
