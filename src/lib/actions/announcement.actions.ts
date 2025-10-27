// src/lib/actions/announcement.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { cache } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '../prisma';
import redis from '../redis';
import type { Announcement } from '@prisma/client';

export type AnnouncementWithAuthor = Announcement & { author: { name: string | null } };

const STUDENT_ANNOUNCEMENTS_CACHE_KEY = (studentId: string) => `announcements:student:${studentId}`;
const CLASS_ANNOUNCEMENTS_CACHE_KEY = (classroomId: string) => `announcements:class:${classroomId}`;
const PUBLIC_ANNOUNCEMENTS_CACHE_KEY = 'announcements:public';

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
  
  // Invalider le cache Redis
  if (redis) {
      if (target === 'public') {
          await redis.del(PUBLIC_ANNOUNCEMENTS_CACHE_KEY);
      } else {
          // Invalider le cache pour la classe et pour chaque élève de la classe
          await redis.del(CLASS_ANNOUNCEMENTS_CACHE_KEY(target));
          const students = await prisma.user.findMany({ where: { classeId: target }, select: { id: true } });
          const studentKeys = students.map(s => STUDENT_ANNOUNCEMENTS_CACHE_KEY(s.id));
          if(studentKeys.length > 0) await redis.del(...studentKeys);
      }
      // Invalider le cache public car les annonces publiques sont aussi retournées pour les classes/étudiants
      await redis.del(PUBLIC_ANNOUNCEMENTS_CACHE_KEY);
      console.log('🔄 Cache Redis pour les annonces invalidé.');
  }

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
    const cacheKey = PUBLIC_ANNOUNCEMENTS_CACHE_KEY;
    if (redis) {
        const cached = await redis.get(cacheKey);
        if (cached) {
            console.log('⚡️ [CACHE] Annonces publiques servies depuis Redis.');
            return JSON.parse(cached);
        }
    }

    console.log(`📢 [DB] - Récupération de ${limit} annonces publiques.`);
    const announcements = await prisma.announcement.findMany({
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

    if (redis) {
        await redis.set(cacheKey, JSON.stringify(announcements), 'EX', 3600); // Cache pour 1 heure
    }

    return announcements;
});

export async function getStudentAnnouncements(studentId: string): Promise<AnnouncementWithAuthor[]> {
    const cacheKey = STUDENT_ANNOUNCEMENTS_CACHE_KEY(studentId);
    if(redis) {
        const cached = await redis.get(cacheKey);
        if(cached) {
            console.log(`⚡️ [CACHE] Annonces pour l'élève ${studentId} servies depuis Redis.`);
            return JSON.parse(cached);
        }
    }

    console.log(`📢 [DB] - Récupération des annonces pour l'élève ${studentId}.`);
    const student = await prisma.user.findUnique({ where: { id: studentId } });
    if (!student) return [];

    const announcements = await prisma.announcement.findMany({
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

    if(redis) {
        await redis.set(cacheKey, JSON.stringify(announcements), 'EX', 3600); // Cache 1 heure
    }
    
    return announcements;
}

export async function getClassAnnouncements(classroomId: string): Promise<AnnouncementWithAuthor[]> {
    const cacheKey = CLASS_ANNOUNCEMENTS_CACHE_KEY(classroomId);
    if(redis) {
        const cached = await redis.get(cacheKey);
        if(cached) {
             console.log(`⚡️ [CACHE] Annonces pour la classe ${classroomId} servies depuis Redis.`);
            return JSON.parse(cached);
        }
    }

    console.log(`📢 [DB] - Récupération des annonces pour la classe ${classroomId}.`);
    const announcements = await prisma.announcement.findMany({
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

    if(redis) {
        await redis.set(cacheKey, JSON.stringify(announcements), 'EX', 3600);
    }
    
    return announcements;
}
