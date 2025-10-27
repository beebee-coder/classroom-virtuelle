// src/lib/actions/student.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import prisma from '../prisma';
import redis from '../redis';

const STUDENT_DATA_CACHE_KEY = (id: string) => `student:${id}`;

export async function getStudentData(id: string) {
    if (!id) return null;

    const cacheKey = STUDENT_DATA_CACHE_KEY(id);
    if (redis) {
        try {
            const cachedData = await redis.get(cacheKey);
            if (cachedData) {
                console.log(`⚡️ [CACHE] Données pour l'élève ${id} servies depuis Redis.`);
                return JSON.parse(cachedData);
            }
        } catch (error) {
             console.error('⚠️ Erreur de lecture du cache Redis pour getStudentData (non bloquant):', error);
        }
    }
    
    console.log(`🧑‍🎓 [DB] Récupération des données pour l'élève ID: ${id}`);
    
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

    if (redis) {
        try {
            // Mettre en cache les données avec une expiration de 1 heure
            await redis.set(cacheKey, JSON.stringify(student), 'EX', 3600);
        } catch (error) {
            console.error('⚠️ Erreur d\'écriture du cache Redis pour getStudentData (non bloquant):', error);
        }
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

    // Invalider le cache de l'élève
    if (redis) {
        try {
            await redis.del(STUDENT_DATA_CACHE_KEY(studentId));
            console.log(`🔄 Cache Redis pour l'élève ${studentId} invalidé.`);
        } catch(error) {
            console.error('⚠️ Erreur d\'invalidation du cache Redis pour setStudentCareer (non bloquant):', error);
        }
    }
    
    revalidatePath(`/student/dashboard`);
    revalidatePath(`/student/${studentId}`);
    if (student?.classeId) {
        revalidatePath(`/teacher/class/${student.classeId}`);
    }
}
