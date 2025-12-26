// src/lib/actions/student.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import prisma from '../prisma';
import type { User, Classroom, EtatEleve, Metier, StudentProgress, Task } from '@prisma/client';

type StudentWithDetails = User & {
    classe: Classroom | null;
    etat: (EtatEleve & { metier: Metier | null }) | null;
    studentProgress: StudentProgress[];
};

export async function getStudentData(id: string): Promise<StudentWithDetails | null> {
    if (!id) {
        return null;
    }
    const student = await prisma.user.findUnique({
        where: { id },
        include: {
            classe: true,
            etat: {
                include: {
                    metier: true
                }
            },
            studentProgress: true,
        }
    });

    if (!student || student.role !== 'ELEVE') {
        return null;
    }
    return student as StudentWithDetails;
}
export async function getStudentDataByEmail(email: string): Promise<StudentWithDetails | null> {
    if (!email) {
        return null;
    }
    const student = await prisma.user.findUnique({
        where: { 
            email: email,
            role: 'ELEVE'
        },
        include: {
            classe: true,
            etat: {
                include: {
                    metier: true
                }
            },
            studentProgress: true,
        }
    });

    if (!student) {
        return null;
    }
    return student as StudentWithDetails;
}
export async function setStudentCareer(studentId: string, careerId: string | null): Promise<{ success: boolean; error?: string }> {
    if (!studentId) {
        return { success: false, error: 'ID élève manquant' };
    }
    try {
        const student = await prisma.user.findUnique({
            where: { id: studentId },
            select: { id: true, role: true, classeId: true }
        });

        if (!student || student.role !== 'ELEVE') {
            throw new Error('Élève non trouvé ou non autorisé');
        }

        if (careerId) {
            const career = await prisma.metier.findUnique({
                where: { id: careerId },
                select: { id: true }
            });
            if (!career) throw new Error('Métier non trouvé');
        }

        await prisma.etatEleve.upsert({
            where: { eleveId: studentId },
            update: { metierId: careerId },
            create: { eleveId: studentId, metierId: careerId }
        });
        
        revalidatePath('/student/dashboard');
        revalidatePath(`/student/${studentId}`);
        if (student.classeId) {
            revalidatePath(`/teacher/class/${student.classeId}`);
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Erreur lors du changement de métier' };
    }
}
