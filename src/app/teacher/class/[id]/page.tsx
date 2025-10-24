// src/app/teacher/class/[id]/page.tsx
import { notFound, redirect } from 'next/navigation';
import ClassPageClient from './ClassPageClient';
import { getAuthSession } from '@/lib/session';
import { getClassAnnouncements } from '@/lib/actions/announcement.actions';
import type { User, Classroom, Announcement } from '@prisma/client';

// DUMMY DATA
const allDummyStudents: (User & { etat: { isPunished: boolean } | null })[] = [
    // Class A
    { id: 'student1', name: 'Ahmed', email: 'ahmed@example.com', points: 1250, image: null, etat: { isPunished: false }, ambition: 'Devenir Astronaute', classeId: 'classe-a', emailVerified: null, parentPassword: null, role: 'ELEVE' },
    { id: 'student2', name: 'Bilel', email: 'bilel@example.com', points: 980, image: null, etat: { isPunished: false }, ambition: 'Explorer les fonds marins', classeId: 'classe-a', emailVerified: null, parentPassword: null, role: 'ELEVE' },
    { id: 'student3', name: 'Fatima', email: 'fatima@example.com', points: 1500, image: null, etat: { isPunished: true }, ambition: 'Créer des jeux vidéo', classeId: 'classe-a', emailVerified: null, parentPassword: null, role: 'ELEVE' },
    { id: 'student4', name: 'Khadija', email: 'khadija@example.com', points: 750, image: null, etat: { isPunished: false }, ambition: 'Devenir chef cuisinier', classeId: 'classe-a', emailVerified: null, parentPassword: null, role: 'ELEVE' },
    { id: 'student5', name: 'Youssef', email: 'youssef@example.com', points: 1100, image: null, etat: { isPunished: false }, ambition: 'Être un grand artiste', classeId: 'classe-a', emailVerified: null, parentPassword: null, role: 'ELEVE' },
    { id: 'student6', name: 'Amina', email: 'amina@example.com', points: 850, image: null, etat: { isPunished: false }, ambition: 'Protéger la nature', classeId: 'classe-a', emailVerified: null, parentPassword: null, role: 'ELEVE' },
    { id: 'student7', name: 'Omar', email: 'omar@example.com', points: 1300, image: null, etat: { isPunished: false }, ambition: 'Construire des robots', classeId: 'classe-a', emailVerified: null, parentPassword: null, role: 'ELEVE' },
    { id: 'student8', name: 'Leila', email: 'leila@example.com', points: 920, image: null, etat: { isPunished: false }, ambition: 'Soigner les animaux', classeId: 'classe-a', emailVerified: null, parentPassword: null, role: 'ELEVE' },
    { id: 'student9', name: 'Ibrahim', email: 'ibrahim@example.com', points: 1600, image: null, etat: { isPunished: false }, ambition: 'Devenir pompier', classeId: 'classe-a', emailVerified: null, parentPassword: null, role: 'ELEVE' },
    { id: 'student10', name: 'Nora', email: 'nora@example.com', points: 700, image: null, etat: { isPunished: false }, ambition: 'Voyager dans le temps', classeId: 'classe-a', emailVerified: null, parentPassword: null, role: 'ELEVE' },
    // Class B
    { id: 'student11', name: 'Ali', email: 'ali@example.com', points: 1150, image: null, etat: { isPunished: false }, ambition: 'Piloter des avions', classeId: 'classe-b', emailVerified: null, parentPassword: null, role: 'ELEVE' },
    { id: 'student12', name: 'Sofia', email: 'sofia@example.com', points: 1050, image: null, etat: { isPunished: false }, ambition: 'Écrire des histoires', classeId: 'classe-b', emailVerified: null, parentPassword: null, role: 'ELEVE' },
    // ...
];

type ClassroomWithDetails = Classroom & { eleves: (User & { etat: { isPunished: boolean } | null })[] };

const dummyClassrooms: { [key: string]: ClassroomWithDetails } = {
    'classe-a': {
        id: 'classe-a',
        nom: 'Classe 6ème A',
        professeurId: 'teacher-id',
        eleves: allDummyStudents.slice(0,10)
    },
    'classe-b': {
        id: 'classe-b',
        nom: 'Classe 6ème B',
        professeurId: 'teacher-id',
        eleves: allDummyStudents.slice(10,12)
    },
    'classe-c': {
        id: 'classe-c',
        nom: 'Classe 5ème A',
        professeurId: 'teacher-id',
        eleves: []
    }
};

type AnnouncementWithAuthor = Announcement & { author: { name: string | null } };

export default async function ClassPage({ params }: { params: { id: string } }) {
  const classroomId = params.id;
  const session = await getAuthSession();

  if (!session?.user || session.user.role !== 'PROFESSEUR') {
      redirect('/login');
  }

  const user = session.user as User;

  // Fetch classroom data - USING DUMMY DATA
  const classroom = dummyClassrooms[classroomId];

  if (!classroom) {
    notFound();
  }

  const announcements = await getClassAnnouncements(classroom.id) as AnnouncementWithAuthor[];
  
  return <ClassPageClient classroom={classroom} teacher={user} announcements={announcements} />;
}
