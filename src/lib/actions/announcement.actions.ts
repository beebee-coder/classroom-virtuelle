// src/lib/actions/announcement.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { AnnouncementWithAuthor } from '../types';
import { cache } from 'react';

const dummyAnnouncements: AnnouncementWithAuthor[] = [
    {
        id: 'anno-1',
        title: 'Bienvenue sur Classroom Connector !',
        content: 'C\'est la plateforme où l\'apprentissage devient une aventure. Participez, gagnez des points et explorez votre avenir !',
        author: { name: 'Professeur Test' },
        authorId: 'teacher-id',
        createdAt: new Date(),
        classeId: null,
        attachmentUrl: null,
    },
    {
        id: 'anno-2',
        title: 'Rappel pour la 6ème A',
        content: 'N\'oubliez pas de préparer vos questions pour la session de demain sur les volcans.',
        author: { name: 'Professeur Test' },
        authorId: 'teacher-id',
        createdAt: new Date(Date.now() - 86400000), // Yesterday
        classeId: 'classe-a',
        attachmentUrl: null,
    },
    {
        id: 'anno-3',
        title: 'Projet Art Plastique',
        content: 'La date limite pour le projet d\'art plastique est repoussée à vendredi.',
        author: { name: 'Professeur Test' },
        authorId: 'teacher-id',
        createdAt: new Date(Date.now() - 172800000), // 2 days ago
        classeId: null,
        attachmentUrl: 'https://example.com/document.pdf',
    }
];

export async function createAnnouncement(formData: FormData) {
  // DUMMY ACTION
  console.log('[DUMMY] Creating announcement with data:', formData);
  revalidatePath('/');
  revalidatePath('/teacher');
  const target = formData.get('target') as string;
  if (target !== 'public') {
    revalidatePath(`/teacher/class/${target}`);
  }
}

export const getPublicAnnouncements = cache(async (limit: number = 3): Promise<AnnouncementWithAuthor[]> => {
    // DUMMY DATA
    console.log('[DUMMY] Getting public announcements.');
    return dummyAnnouncements.filter(a => a.classeId === null).slice(0, limit);
});

export async function getStudentAnnouncements(studentId: string): Promise<AnnouncementWithAuthor[]> {
    // DUMMY DATA
    console.log('[DUMMY] Getting announcements for student:', studentId);
    return dummyAnnouncements;
}

export async function getClassAnnouncements(classroomId: string): Promise<AnnouncementWithAuthor[]> {
    // DUMMY DATA
    console.log('[DUMMY] Getting announcements for class:', classroomId);
    return dummyAnnouncements.filter(a => a.classeId === classroomId || a.classeId === null);
}
