// src/lib/actions/class.actions.ts
'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createClass(formData: FormData) {
    const nom = formData.get('nom') as string;
    const professeurId = formData.get('professeurId') as string;

    if (!nom || !professeurId) {
        throw new Error('Nom de la classe et ID du professeur sont requis.');
    }
    
    const newClass = await prisma.classroom.create({
        data: {
            nom,
            professeurId,
        },
    });

    revalidatePath('/teacher');

    return newClass;
}

export async function addStudentToClass(formData: FormData) {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const ambition = formData.get('ambition') as string;
    const classroomId = formData.get('classroomId') as string;

    if (!name || !email || !classroomId) {
        throw new Error('Nom, email et ID de classe sont requis.');
    }
    
    const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } });
    if (!classroom) throw new Error('Classe non trouvée.');

    // Optional: Check if user with this email already exists
    let user = await prisma.user.findUnique({ where: { email } });

    if (user) {
        // If user exists, update their class
        user = await prisma.user.update({
            where: { id: user.id },
            data: { classroomId },
        });
    } else {
        // If user doesn't exist, create them
        user = await prisma.user.create({
            data: {
                name,
                email,
                ambition,
                classroomId,
                role: 'ELEVE',
            },
        });
        
         // Create a default student state for the new student
        await prisma.etatEleve.create({
            data: {
                eleveId: user.id,
                isPunished: false,
            },
        });
    }

    revalidatePath(`/teacher/class/${classroomId}`);
    
    return user;
}
