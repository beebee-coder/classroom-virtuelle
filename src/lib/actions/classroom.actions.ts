// src/lib/actions/classroom.actions.ts
'use server';

import prisma from '../prisma';
import type { Classroom, User, EtatEleve } from '@prisma/client';

export type ClassroomWithStudents = Classroom & {
    eleves: (User & {
        etat: EtatEleve | null;
    })[];
};

export async function getClassroomWithStudents(classroomId: string): Promise<ClassroomWithStudents | null> {
    try {
        const classroom = await prisma.classroom.findUnique({
            where: { id: classroomId },
            include: {
                eleves: {
                    include: {
                        etat: true,
                    },
                    orderBy: {
                        points: 'desc'
                    }
                }
            }
        });
        
        return classroom as ClassroomWithStudents | null;
        
    } catch (error) {
        console.error('❌ [CLASSROOM ACTION] - Erreur:', error);
        throw new Error('Impossible de récupérer les données de la classe');
    }
}

export async function getCurrentUserForClassPage(userId: string): Promise<User | null> {
    if (!userId) return null;
    return await prisma.user.findUnique({
      where: { id: userId },
    });
}

export async function getClassroomWithDetailsAndTeacher(classroomId: string, teacherId: string) {
    const [classroom, teacher] = await Promise.all([
        prisma.classroom.findUnique({
            where: { id: classroomId, professeurId: teacherId },
            include: {
                eleves: {
                    include: {
                        etat: {
                            select: {
                                isPunished: true,
                                metierId: true,
                            },
                        },
                    },
                    orderBy: {
                        points: 'desc'
                    }
                },
            },
        }),
        prisma.user.findUnique({
            where: { id: teacherId }
        })
    ]);

    return { classroom, teacher };
}
