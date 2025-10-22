// src/lib/actions/student.actions.ts
'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { pusherServer } from '../pusher/server';

export async function setStudentCareer(studentId: string, careerId: string | null) {
    
    // Find or create the student's state based on the user ID
    let etatEleve = await prisma.etatEleve.findUnique({
        where: { eleveId: studentId },
    });

    if (!etatEleve) {
        etatEleve = await prisma.etatEleve.create({
            data: { eleveId: studentId }
        });
    }

    // Update the state with the new career
    await prisma.etatEleve.update({
        where: { id: etatEleve.id },
        data: {
            metierId: careerId,
        },
    });

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { classroomId: true }
    });

    if (student?.classroomId) {
        await pusherServer.trigger(`presence-classe-${student.classroomId}`, 'student-updated', {
            studentId,
        });
    }
    
    // Revalidate the student's page to show the changes
    revalidatePath(`/student/${studentId}`);
}
