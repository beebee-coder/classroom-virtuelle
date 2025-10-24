// src/lib/actions/student.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import prisma from '../prisma';

export async function getStudentData(id: string) {
    console.log(`🧑‍🎓 [ACTION] Récupération des données pour l'élève ID: ${id}`);
    
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

    return student;
}


export async function setStudentCareer(studentId: string, careerId: string | null) {
    console.log(`🎨 [ACTION] Changement de métier pour l'élève ${studentId} vers le métier ${careerId}`);

    await prisma.etatEleve.update({
        where: { eleveId: studentId },
        data: {
            metierId: careerId,
        }
    });
    
    const student = await prisma.user.findUnique({ where: { id: studentId }});
    
    revalidatePath(`/student/dashboard`);
    revalidatePath(`/student/${studentId}`);
    if (student?.classeId) {
        revalidatePath(`/teacher/class/${student.classeId}`);
    }
}
