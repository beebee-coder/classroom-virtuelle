// src/lib/actions/student.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import prisma from '../prisma';
import type { User, Classroom, EtatEleve, Metier, StudentProgress } from '@prisma/client';

const STUDENT_DATA_CACHE_KEY = (id: string) => `student:${id}`;

// Type pour les données d'élève complètes
type StudentWithDetails = User & {
    classe: Classroom | null;
    etat: (EtatEleve & { metier: Metier | null }) | null;
    studentProgress: StudentProgress[];
};

export async function getStudentData(id: string): Promise<StudentWithDetails | null> {
    console.log(`🧑‍🎓 [ACTION] getStudentData pour l'ID: ${id}`);
    
    if (!id) {
        console.error('❌ [ACTION] ID manquant pour getStudentData');
        return null;
    }

    console.log(`🧑‍🎓 [DB] Récupération des données pour l'élève ID: ${id}`);
    
    try {
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

        if (!student) {
            console.error(`❌ [ACTION] Élève non trouvé avec l'ID: ${id}`);
            return null;
        }

        if (student.role !== 'ELEVE') {
            console.error(`❌ [ACTION] L'utilisateur ${id} n'est pas un élève (rôle: ${student.role})`);
            return null;
        }

        console.log(`✅ [ACTION] Données chargées pour l'élève: ${student.name} (classe: ${student.classe?.nom || 'Aucune'})`);

        return student as StudentWithDetails;

    } catch (error) {
        console.error(`❌ [ACTION] Erreur base de données pour l'élève ${id}:`, error);
        return null;
    }
}
// Ajoutez cette fonction qui recherche par email
export async function getStudentDataByEmail(email: string): Promise<StudentWithDetails | null> {
    console.log(`🧑‍🎓 [ACTION] getStudentDataByEmail pour l'email: ${email}`);
    
    if (!email) {
        console.error('❌ [ACTION] Email manquant pour getStudentDataByEmail');
        return null;
    }
    
    console.log(`🧑‍🎓 [DB] Récupération des données pour l'élève email: ${email}`);
    
    try {
        const student = await prisma.user.findUnique({
            where: { 
                email: email,
                role: 'ELEVE' // S'assurer que c'est bien un élève
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
            console.error(`❌ [ACTION] Élève non trouvé avec l'email: ${email}`);
            return null;
        }

        console.log(`✅ [ACTION] Données chargées pour l'élève: ${student.name} (ID: ${student.id})`);

        return student as StudentWithDetails;

    } catch (error) {
        console.error(`❌ [ACTION] Erreur base de données pour l'élève ${email}:`, error);
        return null;
    }
}
export async function setStudentCareer(studentId: string, careerId: string | null): Promise<{ success: boolean; error?: string }> {
    console.log(`🎨 [ACTION] setStudentCareer pour l'élève ${studentId} vers le métier ${careerId}`);

    if (!studentId) {
        return { 
            success: false, 
            error: 'ID élève manquant' 
        };
    }

    try {
        const student = await prisma.user.findUnique({
            where: { id: studentId },
            select: { 
                id: true, 
                role: true, 
                classeId: true
            }
        });

        if (!student || student.role !== 'ELEVE') {
            throw new Error('Élève non trouvé ou non autorisé');
        }

        if (careerId) {
            const career = await prisma.metier.findUnique({
                where: { id: careerId },
                select: { id: true }
            });
            
            if (!career) {
                throw new Error('Métier non trouvé');
            }
        }

        await prisma.etatEleve.upsert({
            where: { eleveId: studentId },
            update: {
                metierId: careerId,
            },
            create: {
                eleveId: studentId,
                metierId: careerId,
            }
        });
        
        console.log(`✅ [ACTION] Métier mis à jour pour l'élève ${studentId}`);
        
        revalidatePath('/student/dashboard');
        revalidatePath(`/student/${studentId}`);
        if (student.classeId) {
            revalidatePath(`/teacher/class/${student.classeId}`);
        }

        return { success: true };

    } catch (error) {
        console.error(`❌ [ACTION] Erreur lors du changement de métier pour ${studentId}:`, error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Erreur lors du changement de métier' 
        };
    }
}

export async function getStudentProgress(studentId: string) {
    console.log(`📈 [ACTION] getStudentProgress pour l'élève: ${studentId}`);
    
    if (!studentId) {
        console.error('❌ [ACTION] ID élève manquant pour getStudentProgress');
        return [];
    }

    try {
        const progress = await prisma.studentProgress.findMany({
            where: { studentId },
            include: {
                task: true
            },
            orderBy: {
                completionDate: 'desc'
            }
        });
        console.log(`  -> ${progress.length} entrées de progression trouvées.`);
        return progress;
    } catch (error) {
        console.error(`❌ [ACTION] Erreur lors de la récupération des progrès pour ${studentId}:`, error);
        return [];
    }
}

export async function getStudentDetails(studentId: string): Promise<StudentWithDetails | null> {
    console.log(`ℹ️ [ACTION] getStudentDetails pour l'élève: ${studentId}`);
    
    if (!studentId) {
        console.error('❌ [ACTION] ID élève manquant pour getStudentDetails');
        return null;
    }

    try {
        const student = await prisma.user.findUnique({
            where: { id: studentId },
            include: {
                classe: {
                    include: {
                        professeur: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    }
                },
                etat: {
                    include: {
                        metier: true
                    }
                },
                studentProgress: {
                    include: {
                        task: true
                    },
                    orderBy: {
                        completionDate: 'desc'
                    }
                }
            }
        });

        if (!student || student.role !== 'ELEVE') {
            console.log(`  -> Élève non trouvé ou rôle incorrect.`);
            return null;
        }

        console.log(`✅ [ACTION] Détails complets récupérés pour ${studentId}.`);
        return student as StudentWithDetails;
    } catch (error) {
        console.error(`❌ [ACTION] Erreur lors de la récupération des détails pour ${studentId}:`, error);
        return null;
    }
}
