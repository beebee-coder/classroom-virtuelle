// src/lib/actions/teacher.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import type { StudentProgress, Task, User } from '@prisma/client';

type TaskForProfessorValidation = StudentProgress & {
  task: Task;
  student: Pick<User, 'id' | 'name'>;
};


// ---=== BYPASS BACKEND ===---
export async function getTasksForProfessorValidation(teacherId: string): Promise<TaskForProfessorValidation[]> {
    console.log(`👀 [BYPASS] Récupération des tâches à valider pour le professeur ${teacherId} (factice).`);
    return [
      {
        id: 'progress1',
        studentId: 'student1',
        taskId: 'task-math',
        status: 'PENDING_VALIDATION',
        completionDate: new Date(),
        submissionUrl: 'https://picsum.photos/seed/proof1/400/300',
        pointsAwarded: 0,
        accuracy: null,
        recipeName: null,
        feedback: null,
        task: { 
            id: 'task-math', 
            title: 'Exercice de maths', 
            description: 'Résoudre une série de problèmes complexes.',
            points: 70, 
            type: 'WEEKLY', 
            category: 'MATH', 
            difficulty: 'MEDIUM',
            validationType: 'PROFESSOR',
            requiresProof: true,
            attachmentUrl: null,
            isActive: true,
            startTime: null,
            duration: null,
        },
        student: { id: 'student1', name: 'Alice' },
      },
      {
        id: 'progress2',
        studentId: 'student2',
        taskId: 'task-science',
        status: 'PENDING_VALIDATION',
        completionDate: new Date(),
        submissionUrl: 'https://picsum.photos/seed/proof2/400/300',
        pointsAwarded: 0,
        accuracy: null,
        recipeName: null,
        feedback: null,
        task: { 
            id: 'task-science', 
            title: 'Exposé scientifique', 
            description: 'Préparer et présenter un sujet scientifique.',
            points: 250, 
            type: 'MONTHLY', 
            category: 'SCIENCE', 
            difficulty: 'HARD',
            validationType: 'PROFESSOR',
            requiresProof: true,
            attachmentUrl: null,
            isActive: true,
            startTime: null,
            duration: null,
        },
        student: { id: 'student2', name: 'Bob' },
      }
    ] as unknown as TaskForProfessorValidation[];
}

export interface ProfessorValidationPayload {
    progressId: string;
    approved: boolean;
    pointsAwarded?: number;
    rejectionReason?: string;
}

export async function validateTaskByProfessor(payload: ProfessorValidationPayload) {
    console.log('👍 [BYPASS] Validation de tâche par le professeur (factice):', payload);

    // Simule la revalidation
    revalidatePath('/teacher/validations');

    // Simule une notification ou une mise à jour de points
    return {
        studentName: 'Élève Test',
        taskTitle: 'Tâche Test',
        pointsAwarded: payload.approved ? (payload.pointsAwarded || 50) : 0,
    };
}

export async function resetAllStudentData() {
  console.log('🔄 [BYPASS] Réinitialisation de toutes les données élève (factice).');
  revalidatePath('/teacher');
  return { success: true, message: "Toutes les données des élèves ont été réinitialisées (simulation)." };
}
// ---=========================---
