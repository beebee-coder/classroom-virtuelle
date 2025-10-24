// src/lib/actions/announcement.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { AnnouncementWithAuthor } from '../types';
import { cache } from 'react';
import { getAuthSession } from '../session';

// ---=== BYPASS BACKEND ===---
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
  console.log('📢 [ACTION] - Création d\'une annonce...');
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== 'PROFESSEUR') {
      console.error('❌ [ACTION] - Tentative de création d\'annonce non autorisée.');
      throw new Error('Unauthorized');
  }

  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  const target = formData.get('target') as string;
  const attachmentUrl = formData.get('attachmentUrl') as string;

  console.log(`  Payload: Titre="${title}", Cible="${target}"`);
  
  // Logique factice d'ajout
  const newAnnouncement: AnnouncementWithAuthor = {
    id: `anno-${Date.now()}`,
    title,
    content,
    authorId: session.user.id,
    author: { name: session.user.name },
    classeId: target === 'public' ? null : target,
    createdAt: new Date(),
    attachmentUrl: attachmentUrl || null,
  };
  dummyAnnouncements.unshift(newAnnouncement);
  console.log('  Annonce ajoutée à la liste factice.');
  
  // Simule la revalidation
  console.log('  Revalidation des chemins...');
  revalidatePath('/');
  revalidatePath('/teacher/dashboard');
  if (target !== 'public') {
    revalidatePath(`/teacher/class/${target}`);
  }
  console.log('✅ [ACTION] - Annonce créée avec succès.');
}

export const getPublicAnnouncements = cache(async (limit: number = 3): Promise<AnnouncementWithAuthor[]> => {
    console.log(`📢 [ACTION] - Récupération de ${limit} annonces publiques (factice).`);
    return dummyAnnouncements.filter(a => a.classeId === null).slice(0, limit);
});

export async function getStudentAnnouncements(studentId: string): Promise<AnnouncementWithAuthor[]> {
    console.log(`📢 [ACTION] - Récupération des annonces pour l'élève ${studentId} (factice).`);
    // Simule la logique : l'élève voit les annonces publiques et celles de sa classe
    // Pour la démo, on suppose que l'élève est dans la 'classe-a'
    const studentClassId = 'classe-a';
    return dummyAnnouncements.filter(a => a.classeId === null || a.classeId === studentClassId);
}

export async function getClassAnnouncements(classroomId: string): Promise<AnnouncementWithAuthor[]> {
    console.log(`📢 [ACTION] - Récupération des annonces pour la classe ${classroomId} (factice).`);
    return dummyAnnouncements.filter(a => a.classeId === classroomId || a.classeId === null);
}
// ---=========================---
