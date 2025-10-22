// src/lib/actions/class.actions.ts
'use server';

import { revalidatePath } from 'next/cache';

// ---=== BYPASS BACKEND ===---
export async function createClass(formData: FormData) {
    const nom = formData.get('nom') as string;
    console.log(`🏫 [BYPASS] Création de la classe (factice): "${nom}"`);
    
    // Simule la revalidation
    revalidatePath('/teacher/classes');
    
    // Retourne un objet factice
    return { id: `class-${Date.now()}`, nom, professeurId: 'teacher-id' };
}

export async function addStudentToClass(formData: FormData) {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const classroomId = formData.get('classroomId') as string;
    console.log(`🧑‍🎓 [BYPASS] Ajout de l'élève ${name} (${email}) à la classe ${classroomId} (factice)`);
    
    // Simule la revalidation
    revalidatePath(`/teacher/class/${classroomId}`);

    // Retourne un objet factice
    return { id: `student-${Date.now()}`, name, email };
}
// ---=========================---
