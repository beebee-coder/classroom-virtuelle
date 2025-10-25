// src/lib/actions/announcement.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { cache } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '../prisma';
import type { Announcement } from '@prisma/client';

export type AnnouncementWithAuthor = Announcement & { author: { name: string | null } };

export async function createAnnouncement(formData: FormData) {
  console.log('📢 [ACTION] - Création d\'une annonce...');
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'PROFESSEUR') {
      console.error('❌ [ACTION] - Tentative de création d\'annonce non autorisée.');
      throw new Error('Unauthorized');
  }

  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  const target = formData.get('target') as string;
  const attachmentUrl = formData.get('attachmentUrl') as string;

  console.log(`  Payload: Titre="${title}", Cible="${target}"`);
  
  await prisma.announcement.create({
    data: {
      title,
      content,
      authorId: session.user.id,
      classeId: target === 'public' ? null : target,
      attachmentUrl: attachmentUrl || null,
    }
  });

  console.log('  Annonce insérée en base de données.');
  
  // Revalidation des chemins
  revalidatePath('/');
  revalidatePath('/teacher/dashboard');
  if (target !== 'public') {
    revalidatePath(`/teacher/class/${target}`);
  }
  revalidatePath('/student/dashboard', 'layout');

  console.log('✅ [ACTION] - Annonce créée avec succès.');
}

export const getPublicAnnouncements = cache(async (limit: number = 3): Promise<AnnouncementWithAuthor[]> => {
    console.log(`📢 [ACTION] - Récupération de ${limit} annonces publiques.`);
    return prisma.announcement.findMany({
        where: { classeId: null },
        take: limit,
        include: {
            author: {
                select: { name: true }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
});

export async function getStudentAnnouncements(studentId: string): Promise<AnnouncementWithAuthor[]> {
    console.log(`📢 [ACTION] - Récupération des annonces pour l'élève ${studentId}.`);
    const student = await prisma.user.findUnique({ where: { id: studentId } });
    if (!student) return [];

    return prisma.announcement.findMany({
        where: {
            OR: [
                { classeId: null },
                { classeId: student.classeId }
            ]
        },
        include: {
            author: {
                select: { name: true }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
}

export async function getClassAnnouncements(classroomId: string): Promise<AnnouncementWithAuthor[]> {
    console.log(`📢 [ACTION] - Récupération des annonces pour la classe ${classroomId}.`);
    return prisma.announcement.findMany({
        where: {
            OR: [
                { classeId: null },
                { classeId: classroomId }
            ]
        },
        include: {
            author: {
                select: { name: true }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
}
