// src/lib/actions/teacher.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import prisma from '../prisma';
import type { StudentProgress, Task, User } from '@prisma/client';
import { ProgressStatus } from '@prisma/client';


export type TaskForProfessorValidation = StudentProgress & {
  task: Task;
  student: Pick<User, 'id' | 'name'>;
};


export async function getTasksForProfessorValidation(teacherId: string): Promise<TaskForProfessorValidation[]> {
    console.log(`🧑‍🏫 [ACTION] getTasksForProfessorValidation pour le professeur: ${teacherId}.`);
    
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

    // 3. Trouver les soumissions en attente de ces élèves pour les tâches nécessitant une validation par le professeur
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

export interface ProfessorValidationPayload {
    progressId: string;
    approved: boolean;
    pointsAwarded?: number;
    rejectionReason?: string;
}

export async function validateTaskByProfessor(payload: ProfessorValidationPayload) {
    console.log('👍 [ACTION] validateTaskByProfessor:', payload);
    const { progressId, approved, pointsAwarded } = payload;
    
    const progress = await prisma.studentProgress.findUnique({
        where: { id: progressId },
        include: { task: true, student: true }
    });

    if (!progress) {
        console.error(`❌ [ACTION] Progression non trouvée: ${progressId}`);
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
                // TODO: Ajouter un champ pour le motif de rejet
            }
        });
    }

    revalidatePath('/teacher/validations');
    revalidatePath(`/student/dashboard`); // Pour que l'élève voie la mise à jour
    revalidatePath(`/student/${progress.studentId}`);
    
    console.log(`✅ [ACTION] Validation terminée pour ${progressId}.`);
    return {
        studentName: progress.student.name,
        taskTitle: progress.task.title,
        pointsAwarded: approved ? (pointsAwarded ?? progress.task.points) : 0,
    };
}

export async function resetAllStudentData() {
  console.log('🔄 [ACTION] resetAllStudentData - Lancement de la réinitialisation complète.');
  
  await prisma.$transaction([
    // 1. Remettre tous les points des élèves à 0
    prisma.user.updateMany({
        where: { role: 'ELEVE' },
        data: { points: 0 }
    }),
    // 2. Supprimer toute la progression des élèves
    prisma.studentProgress.deleteMany({}),
  ]);

  console.log("✅ [ACTION] Toutes les données des élèves ont été réinitialisées.");

  revalidatePath('/teacher', 'layout'); // Revalider toutes les pages enseignantes
  revalidatePath('/student', 'layout'); // Revalider toutes les pages élèves
  
  return { success: true, message: "Toutes les données des élèves ont été réinitialisées avec succès." };
}

export async function validateStudent(studentId: string, classroomId: string): Promise<User> {
  console.log(`✅ [ACTION validateStudent] - Validation de l'élève ${studentId} pour la classe ${classroomId}`);
  
  const student = await prisma.user.update({
    where: { id: studentId },
    data: { 
      validationStatus: 'VALIDATED',
      classeId: classroomId, // Assigner l'élève à la classe
    },
    include: { // Renvoyer toutes les données de l'utilisateur mis à jour
        etat: true,
        classe: true,
        studentProgress: true,
    }
  });

  console.log(`  -> Élève ${student.name} mis à jour avec le statut VALIDATED et assigné à la classe ${classroomId}.`);
  
  // Revalider le chemin de la classe pour forcer le rafraîchissement des données
  revalidatePath(`/teacher/class/${classroomId}`);
  
  // Revalider également le tableau de bord au cas où
  revalidatePath('/teacher/dashboard');
  
  console.log(`  -> Revalidation des chemins déclenchée.`);
  
  return student;
}
