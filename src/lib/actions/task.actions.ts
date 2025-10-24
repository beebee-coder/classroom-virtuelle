// src/lib/actions/task.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { Task, StudentProgress, ProgressStatus } from '@/lib/types';
import { getAuthSession } from '../session';

// ---=== BYPASS BACKEND ===---
export async function createTask(formData: FormData): Promise<Task[]> {
  const title = formData.get('title');
  console.log(`📝 [ACTION TÂCHE] - Création de la tâche (factice): "${title}"`);
  revalidatePath('/teacher/tasks');
  // Retourne un tableau vide car la logique client est optimiste
  return [];
}

export async function updateTask(formData: FormData): Promise<Task[]> {
  const taskId = formData.get('id');
  const title = formData.get('title');
  console.log(`📝 [ACTION TÂCHE] - Mise à jour de la tâche ${taskId} (factice): "${title}"`);
  revalidatePath('/teacher/tasks');
  return [];
}

export async function deleteTask(id: string): Promise<Task[]> {
    console.log(`🗑️ [ACTION TÂCHE] - Suppression de la tâche ${id} (factice)`);
    revalidatePath('/teacher/tasks');
    return [];
}


export async function completeTask(taskId: string, submissionUrl?: string): Promise<StudentProgress> {
  const session = await getAuthSession();
  const studentId = session?.user?.id;

  if (!studentId) {
    console.error('❌ [ACTION TÂCHE] - Tentative de complétion de tâche sans session élève.');
    throw new Error("Authentification requise.");
  }
  
  console.log(`✅ [ACTION TÂCHE] - L'élève ${studentId} soumet la tâche ${taskId}.`);
  if (submissionUrl) {
    console.log(`  -> Preuve soumise (URL): ${submissionUrl}`);
  } else {
    console.log(`  -> Pas de preuve soumise (validation simple ou parentale).`);
  }
  
  // Simule la revalidation pour mettre à jour l'interface de l'élève
  revalidatePath(`/student/dashboard`);
  // Revalide aussi la page des validations pour le prof
  revalidatePath('/teacher/validations');

  // Retourne un objet de progression factice pour l'UI
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
