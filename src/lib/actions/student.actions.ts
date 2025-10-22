// src/lib/actions/student.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { pusherTrigger } from '../pusher/server';
import { StudentWithStateAndCareer } from '../types';
import { dummyStudentData } from '../dummy-data';

// ---=== BYPASS BACKEND ===---

export async function getStudentData(id: string): Promise<StudentWithStateAndCareer | null> {
    console.log(`🧑‍🎓 [BYPASS] Récupération des données factices pour l'élève ID: ${id}`);
    return dummyStudentData[id] || null;
}


export async function setStudentCareer(studentId: string, careerId: string | null) {
    console.log(`🎨 [BYPASS] Changement de métier (factice) pour l'élève ${studentId} vers le métier ${careerId}`);

    const classroomId = 'classe-a'; // ID de classe factice pour la démo
    
    console.log(`📡 [PUSHER] Déclenchement de "student-updated" pour l'élève ${studentId}`);
    await pusherTrigger(`presence-classe-${classroomId}`, 'student-updated', {
        studentId,
    });
    
    // Simule la revalidation
    revalidatePath(`/student/${studentId}`);
    revalidatePath(`/student/dashboard`);
    revalidatePath(`/teacher/class/${classroomId}`); // Revalidate class view for teacher
}
// ---=========================---
