// src/lib/actions/class.actions.ts
'use server';

import { revalidatePath } from 'next/cache';

export async function createClass(formData: FormData) {
    // DUMMY ACTION
    const nom = formData.get('nom') as string;
    console.log('[DUMMY] Creating class:', nom);
    revalidatePath('/teacher/classes');
    return { id: 'new-class-id', nom, professeurId: 'teacher-id' };
}

export async function addStudentToClass(formData: FormData) {
    // DUMMY ACTION
    const name = formData.get('name') as string;
    const classroomId = formData.get('classroomId') as string;
    console.log(`[DUMMY] Adding student ${name} to class ${classroomId}`);
    revalidatePath(`/teacher/class/${classroomId}`);
    return { id: 'new-student-id', name, email: 'new@example.com' };
}
