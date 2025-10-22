// src/lib/actions/student.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { pusherServer } from '../pusher/server';

// ---=== BYPASS BACKEND ===---
export async function setStudentCareer(studentId: string, careerId: string | null) {
    console.log(`🎨 [BYPASS] Changement de métier (factice) pour l'élève ${studentId} vers le métier ${careerId}`);

    const classroomId = 'classe-a'; // ID de classe factice pour la démo
    
    console.log(`📡 [PUSHER] Déclenchement de "student-updated" pour l'élève ${studentId}`);
    await pusherServer.trigger(`presence-classe-${classroomId}`, 'student-updated', {
        studentId,
    });
    
    // Simule la revalidation
    revalidatePath(`/student/${studentId}`);
    revalidatePath(`/student/dashboard`);
}
// ---=========================---
