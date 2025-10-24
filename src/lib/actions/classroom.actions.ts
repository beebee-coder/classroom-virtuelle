// src/lib/actions/classroom.actions.ts
'use server';

import prisma from '../prisma';
import type { Classroom, User, EtatEleve } from '@prisma/client';

type ClassroomWithDetails = Classroom & {
    eleves: (User & {
        etat: EtatEleve | null;
    })[];
};

export async function getClassroomWithStudents(classroomId: string): Promise<ClassroomWithDetails | null> {
    try {
        console.log(`🏫 [CLASSROOM ACTION] - Récupération de la classe ${classroomId}`);
        
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
        
        return classroom as ClassroomWithDetails | null;
        
    } catch (error) {
        console.error('❌ [CLASSROOM ACTION] - Erreur:', error);
        throw new Error('Impossible de récupérer les données de la classe');
    }
}
