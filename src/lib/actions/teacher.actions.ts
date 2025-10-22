// src/lib/actions/teacher.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { ProgressStatus, ValidationType, Role } from '@prisma/client';
import type { TaskForProfessorValidation } from '../types';
import { startOfDay, startOfWeek, isMonday, isFirstDayOfMonth } from 'date-fns';

export async function endAllActiveSessionsForTeacher() {
  // DUMMY ACTION
  console.log('[DUMMY] Ending all active sessions for teacher.');
  return;
}

export async function endAllActiveSessionsAndHideCardForTeacher() {
    // DUMMY ACTION
    console.log('[DUMMY] Ending sessions and hiding card.');
    return { success: true };
}


export async function getTasksForProfessorValidation(teacherId: string): Promise<TaskForProfessorValidation[]> {
    // DUMMY DATA
    console.log('[DUMMY] Getting tasks for professor validation.');
    return [
      {
        id: 'progress1',
        studentId: 'student1',
        taskId: 'task-math',
        status: ProgressStatus.PENDING_VALIDATION,
        completionDate: new Date(),
        submissionUrl: 'https://picsum.photos/seed/proof1/400/300',
        pointsAwarded: 0,
        accuracy: null,
        recipeName: null,
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
        status: ProgressStatus.PENDING_VALIDATION,
        completionDate: new Date(),
        submissionUrl: 'https://picsum.photos/seed/proof2/400/300',
        pointsAwarded: 0,
        accuracy: null,
        recipeName: null,
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
    ] as TaskForProfessorValidation[];
}

export interface ProfessorValidationPayload {
    progressId: string;
    approved: boolean;
    pointsAwarded?: number;
    rejectionReason?: string;
}

export async function validateTaskByProfessor(payload: ProfessorValidationPayload) {
    // DUMMY ACTION
    console.log('[DUMMY] Validating task by professor', payload);

    revalidatePath('/teacher/validations');

    return {
        studentName: 'Élève Test',
        taskTitle: 'Tâche Test',
        pointsAwarded: payload.pointsAwarded || 0,
    };
}

export async function resetAllStudentData() {
  // DUMMY ACTION
  console.log('[DUMMY] Resetting all student data.');
  revalidatePath('/teacher');
  return { success: true, message: "Toutes les données des élèves ont été réinitialisées (simulation)." };
}

export async function resetPeriodicData() {
  // DUMMY ACTION
  console.log('[DUMMY] Resetting periodic data.');
  revalidatePath('/teacher');
  return { success: true, message: "La maintenance périodique a été effectuée (simulation)." };
}
