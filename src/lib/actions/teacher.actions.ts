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
    console.log(`👀 [ACTION] Récupération des tâches à valider pour le professeur ${teacherId}.`);
    
    // 1. Trouver les classes du professeur
    const classrooms = await prisma.classroom.findMany({
        where: { professeurId: teacherId },
        select: { id: true }
    });
    const classroomIds = classrooms.map(c => c.id);

    // 2. Trouver les élèves dans ces classes
    const students = await prisma.user.findMany({
        where: { classeId: { in: classroomIds } },
        select: { id: true }
    });
    const studentIds = students.map(s => s.id);

    // 3. Trouver les soumissions en attente de ces élèves pour les tâches nécessitant une validation par le professeur
    return prisma.studentProgress.findMany({
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
}

export interface ProfessorValidationPayload {
    progressId: string;
    approved: boolean;
    pointsAwarded?: number;
    rejectionReason?: string;
}

export async function validateTaskByProfessor(payload: ProfessorValidationPayload) {
    console.log('👍 [ACTION] Validation de tâche par le professeur:', payload);
    const { progressId, approved, pointsAwarded } = payload;
    
    const progress = await prisma.studentProgress.findUnique({
        where: { id: progressId },
        include: { task: true, student: true }
    });

    if (!progress) {
        throw new Error("Progression de tâche non trouvée.");
    }
    
    if (approved) {
        const finalPoints = pointsAwarded ?? progress.task.points;
        
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

    return {
        studentName: progress.student.name,
        taskTitle: progress.task.title,
        pointsAwarded: approved ? (pointsAwarded ?? progress.task.points) : 0,
    };
}

export async function resetAllStudentData() {
  console.log('🔄 [ACTION] Réinitialisation de toutes les données élève.');
  
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

  revalidatePath('/teacher'); // Revalider toutes les pages enseignantes
  revalidatePath('/student'); // Revalider toutes les pages élèves
  
  return { success: true, message: "Toutes les données des élèves ont été réinitialisées avec succès." };
}
