// src/lib/actions/task.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { Task, StudentProgress, ProgressStatus } from '@/lib/types';

// ---=== BYPASS BACKEND ===---
export async function createTask(formData: FormData): Promise<Task[]> {
  const title = formData.get('title');
  console.log(`📝 [BYPASS] Création de la tâche (factice): "${title}"`);
  revalidatePath('/teacher/tasks');
  // Retourne un tableau vide car la logique client est optimiste
  return [];
}

export async function updateTask(formData: FormData): Promise<Task[]> {
  const taskId = formData.get('id');
  const title = formData.get('title');
  console.log(`📝 [BYPASS] Mise à jour de la tâche ${taskId} (factice): "${title}"`);
  revalidatePath('/teacher/tasks');
  return [];
}

export async function deleteTask(id: string): Promise<Task[]> {
    console.log(`🗑️ [BYPASS] Suppression de la tâche ${id} (factice)`);
    revalidatePath('/teacher/tasks');
    return [];
}


export async function completeTask(taskId: string, submissionUrl?: string): Promise<StudentProgress> {
  const studentId = 'student1'; // ID factice
  console.log(`✅ [BYPASS] Validation de la tâche ${taskId} pour l'élève ${studentId} (factice)`);
  if (submissionUrl) {
    console.log(`   -> Preuve soumise: ${submissionUrl}`);
  }
  
  // Simule la revalidation
  revalidatePath(`/student/${studentId}`);
  revalidatePath(`/student/dashboard`);

  // Retourne un objet de progression factice
  return {
    id: `progress-${Date.now()}`,
    studentId: studentId,
    taskId: taskId,
    status: 'PENDING_VALIDATION' as ProgressStatus,
    completionDate: new Date(),
    submissionUrl: submissionUrl || null,
    pointsAwarded: 0,
    accuracy: null,
    recipeName: null,
  };
}
// ---=========================---
