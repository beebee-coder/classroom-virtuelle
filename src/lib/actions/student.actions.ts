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
        console.log('❌ [STUDENT ACTIONS] - ID manquant pour getStudentData');
        return null;
    }
    
    try {
        console.log(`🔍 [STUDENT ACTIONS] - Recherche élève avec ID: ${id}`);
        
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

        console.log(`📊 [STUDENT ACTIONS] - Résultat de la recherche:`, {
            trouvé: !!student,
            id: student?.id,
            email: student?.email,
            role: student?.role,
            classeId: student?.classeId,
            validationStatus: student?.validationStatus
        });

        if (!student || student.role !== 'ELEVE') {
            console.log(`❌ [STUDENT ACTIONS] - Utilisateur non trouvé ou pas un élève. Role: ${student?.role}`);
            return null;
        }
        
        console.log(`✅ [STUDENT ACTIONS] - Élève trouvé: ${student.name} (${student.email})`);
        return student as StudentWithDetails;
    } catch (error) {
        console.error('❌ [STUDENT ACTIONS] - Erreur getStudentData:', error);
        return null;
    }
}

export async function getStudentDataByEmail(email: string): Promise<StudentWithDetails | null> {
    if (!email) {
        return null;
    }
    
    try {
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

        return student as StudentWithDetails | null;
    } catch (error) {
        console.error('❌ [STUDENT ACTIONS] - Erreur getStudentDataByEmail:', error);
        return null;
    }
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

        // CORRECTION : Ajouter updatedAt pour le create
        await prisma.etatEleve.upsert({
            where: { eleveId: studentId },
            update: { metierId: careerId },
            create: { 
                eleveId: studentId, 
                metierId: careerId,
                updatedAt: new Date() // AJOUTÉ : Champ requis par Prisma
            }
        });
        
        revalidatePath('/student/dashboard');
        revalidatePath(`/student/${studentId}`);
        if (student.classeId) {
            revalidatePath(`/teacher/class/${student.classeId}`);
        }
        
        return { success: true };
    } catch (error) {
        console.error('❌ [STUDENT ACTIONS] - Erreur setStudentCareer:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Erreur lors du changement de métier' 
        };
    }
}