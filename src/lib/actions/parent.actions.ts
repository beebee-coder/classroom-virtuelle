// src/lib/actions/parent.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { Task, ProgressStatus } from '@/lib/types';

type DetailedFeedback = { taste: number, presentation: number, autonomy: number, comment: string };

export async function setParentPassword(studentId: string, password: string) {
    // DUMMY ACTION
    console.log(`[DUMMY] Setting parent password for student ${studentId}`);
    revalidatePath(`/student/${studentId}/parent`);
}

export async function verifyParentPassword(studentId: string, password: string): Promise<boolean> {
    // DUMMY ACTION
    console.log(`[DUMMY] Verifying parent password for student ${studentId}`);
    return password === 'password';
}

export async function getTasksForValidation(studentId: string): Promise<(Task & { progressId: string })[]> {
    // DUMMY DATA
    console.log(`[DUMMY] Getting tasks for parent validation for student ${studentId}`);
    return [
        {
            id: 'task-cook',
            progressId: 'progress3',
            title: 'Projet créatif mensuel',
            description: 'Réaliser une recette de cuisine et la présenter.',
            points: 200,
            type: 'MONTHLY',
            category: 'ART',
            difficulty: 'HARD',
            validationType: 'PARENT',
            requiresProof: true,
            attachmentUrl: null,
            isActive: true,
            startTime: null,
            duration: null,
        },
        {
            id: 'task-bed',
            progressId: 'progress4',
            title: 'Faire son lit',
            description: 'Un lit bien fait, une journée bien commencée !',
            points: 10,
            type: 'DAILY',
            category: 'HOME',
            difficulty: 'EASY',
            validationType: 'PARENT',
            requiresProof: false,
            attachmentUrl: null,
            isActive: true,
            startTime: null,
            duration: null,
        }
    ] as (Task & { progressId: string })[];
}

export async function validateTaskByParent(
    progressId: string,
    feedback?: DetailedFeedback | number,
    recipeName?: string,
) {
  // DUMMY ACTION
  console.log(`[DUMMY] Validating task by parent: ${progressId}`, { feedback, recipeName });
  revalidatePath(`/student/some-student-id/parent`);
  revalidatePath(`/student/some-student-id`);
  return { pointsAwarded: 50 };
}
```