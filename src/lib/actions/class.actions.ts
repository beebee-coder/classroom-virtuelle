// src/lib/actions/class.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import prisma from '../prisma';
import { Role } from '@prisma/client';

export async function createClass(formData: FormData) {
    const nom = formData.get('nom') as string;
    const teacherId = formData.get('teacherId') as string;
    
    console.log(`🏫 [ACTION] createClass: "${nom}" pour le professeur ${teacherId}`);

    if (!nom || !teacherId) {
        console.error('❌ [ACTION] Données manquantes pour createClass');
        throw new Error('Nom de la classe et ID du professeur sont requis.');
    }

    const newClass = await prisma.classroom.create({
        data: {
            nom,
            professeurId: teacherId,
        }
    });
    
    revalidatePath('/teacher/classes');
    
    console.log(`✅ [ACTION] Classe créée avec succès: ${newClass.id}`);
    return newClass;
}

export async function addStudentToClass(formData: FormData) {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const classroomId = formData.get('classroomId') as string;
    
    console.log(`🧑‍🎓 [ACTION] addStudentToClass: ${name} (${email}) à la classe ${classroomId}`);
    
    if (!name || !email || !classroomId) {
        console.error('❌ [ACTION] Données manquantes pour addStudentToClass');
        throw new Error("Le nom, l'email et l'ID de la classe sont requis.");
    }
    
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        console.error(`❌ [ACTION] Email déjà existant: ${email}`);
        throw new Error("Un utilisateur avec cet email existe déjà.");
    }

    // Utiliser une transaction pour s'assurer que l'élève et son état sont créés ensemble
    const newStudent = await prisma.$transaction(async (tx) => {
        const student = await tx.user.create({
            data: {
                name,
                email,
                role: Role.ELEVE,
                classe: {
                    connect: { id: classroomId }
                },
            }
        });

        await tx.etatEleve.create({
            data: {
                eleveId: student.id,
            }
        });
        
        return student;
    });

    revalidatePath(`/teacher/class/${classroomId}`);

    console.log(`✅ [ACTION] Élève ajouté avec succès: ${newStudent.id}`);
    return newStudent;
}
