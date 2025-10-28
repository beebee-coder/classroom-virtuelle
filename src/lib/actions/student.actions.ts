// src/lib/actions/student.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import prisma from '../prisma';
import getClient from '../redis';

const STUDENT_DATA_CACHE_KEY = (id: string) => `student:${id}`;

export async function getStudentData(id: string) {
    console.log(`🧑‍🎓 [ACTION] getStudentData pour l'ID: ${id}`);
    if (!id) {
        console.error('❌ [ACTION] ID manquant pour getStudentData');
        return null;
    }

    const redis = await getClient();
    
    // ✅ CORRECTION: Vérifier que redis n'est pas null avant de l'utiliser
    if (redis) {
        const cacheKey = STUDENT_DATA_CACHE_KEY(id);
        try {
            const cachedData = await redis.get(cacheKey);
            if (cachedData) {
                console.log(`⚡️ [CACHE] Données pour l'élève ${id} servies depuis Redis.`);
                return JSON.parse(cachedData);
            }
        } catch (error) {
            console.error('⚠️ [ACTION] Erreur de lecture du cache Redis (non bloquant):', error);
        }
    } else {
        console.log('⚠️ [ACTION] Redis non disponible, lecture directe depuis la base de données');
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

        // ✅ CORRECTION: Vérifier que redis n'est pas null avant la mise en cache
        if (redis) {
            const cacheKey = STUDENT_DATA_CACHE_KEY(id);
            try {
                // Mettre en cache les données avec une expiration de 1 heure
                await redis.set(cacheKey, JSON.stringify(student), 'EX', 3600);
                console.log(`💾 [ACTION] Données mises en cache pour l'élève ${id}`);
            } catch (error) {
                console.error('⚠️ [ACTION] Erreur d\'écriture du cache Redis (non bloquant):', error);
            }
        }

        return student;

    } catch (error) {
        console.error(`❌ [ACTION] Erreur base de données pour l'élève ${id}:`, error);
        return null;
    }
}

export async function setStudentCareer(studentId: string, careerId: string | null): Promise<{ success: boolean; error?: string }> {
    console.log(`🎨 [ACTION] setStudentCareer pour l'élève ${studentId} vers le métier ${careerId}`);

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

        // Vérifier que le métier existe si careerId n'est pas null
        if (careerId) {
            const career = await prisma.metier.findUnique({
                where: { id: careerId },
                select: { id: true }
            });
            
            if (!career) {
                throw new Error('Métier non trouvé');
            }
        }

        // Mettre à jour le métier de l'élève
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

        // ✅ CORRECTION: Vérifier que redis n'est pas null avant l'invalidation
        const redis = await getClient();
        if (redis) {
            try {
                await redis.del(STUDENT_DATA_CACHE_KEY(studentId));
                console.log(`🔄 [ACTION] Cache Redis pour l'élève ${studentId} invalidé.`);
            } catch(error) {
                console.error('⚠️ [ACTION] Erreur d\'invalidation du cache Redis (non bloquant):', error);
            }
        } else {
            console.log('⚠️ [ACTION] Redis non disponible, pas d\'invalidation du cache');
        }
        
        // Revalider les pages concernées
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

// Fonction utilitaire pour obtenir les progrès de l'élève
export async function getStudentProgress(studentId: string) {
    console.log(`📈 [ACTION] getStudentProgress pour l'élève: ${studentId}`);
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

// Fonction pour récupérer les détails complets d'un élève
export async function getStudentDetails(studentId: string) {
    console.log(`ℹ️ [ACTION] getStudentDetails pour l'élève: ${studentId}`);
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
        return student;
    } catch (error) {
        console.error(`❌ [ACTION] Erreur lors de la récupération des détails pour ${studentId}:`, error);
        return null;
    }
}