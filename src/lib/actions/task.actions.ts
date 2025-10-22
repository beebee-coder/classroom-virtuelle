// src/lib/actions/task.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { Task, TaskType, TaskCategory, TaskDifficulty, ValidationType, ProgressStatus, StudentProgress } from '@prisma/client';

export async function createTask(formData: FormData): Promise<Task[]> {
  // DUMMY ACTION
  console.log('[DUMMY] Creating task', formData.get('title'));
  revalidatePath('/teacher/tasks');
  return [];
}

export async function updateTask(formData: FormData): Promise<Task[]> {
  // DUMMY ACTION
  console.log('[DUMMY] Updating task', formData.get('id'));
  revalidatePath('/teacher/tasks');
  return [];
}

export async function deleteTask(id: string): Promise<Task[]> {
    // DUMMY ACTION
    console.log('[DUMMY] Deleting task', id);
    revalidatePath('/teacher/tasks');
    return [];
}


export async function completeTask(taskId: string, submissionUrl?: string): Promise<StudentProgress> {
  // DUMMY ACTION
  console.log(`[DUMMY] Completing task ${taskId} for user.`);
  revalidatePath(`/student/some-student-id`);

  return {
    id: `progress-${Math.random()}`,
    studentId: 'some-student-id',
    taskId: taskId,
    status: ProgressStatus.PENDING_VALIDATION,
    completionDate: new Date(),
    submissionUrl: submissionUrl || null,
    pointsAwarded: 0,
    accuracy: null,
    recipeName: null,
  };
}
