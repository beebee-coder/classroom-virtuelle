// src/app/teacher/class/[id]/page.tsx
import { notFound, redirect } from 'next/navigation';
import ClassPageClient from './ClassPageClient';
import { getAuthSession } from '@/lib/session';
import { getClassAnnouncements } from '@/lib/actions/announcement.actions';
import { ClassroomWithDetails, StudentForCard } from '@/lib/types';
import { User } from '@prisma/client';

// DUMMY DATA
const dummyStudents: StudentForCard[] = [
    { id: 'student1', name: 'Alice', email: 'student1@example.com', points: 1250, etat: { isPunished: false } },
    { id: 'student2', name: 'Bob', email: 'student2@example.com', points: 980, etat: { isPunished: false } },
    { id: 'student3', name: 'Charlie', email: 'student3@example.com', points: 1500, etat: { isPunished: true } },
    { id: 'student4', name: 'Diana', email: 'student4@example.com', points: 750, etat: { isPunished: false } },
];

const dummyClassrooms: { [key: string]: ClassroomWithDetails } = {
    'classe-a': {
        id: 'classe-a',
        nom: 'Classe 6ème A',
        eleves: dummyStudents.slice(0,2)
    },
    'classe-b': {
        id: 'classe-b',
        nom: 'Classe 5ème B',
        eleves: dummyStudents.slice(2,4)
    }
};

export default async function ClassPage({ params }: { params: { id: string } }) {
  const classroomId = params.id;
  const session = await getAuthSession();

  if (!session || session.user.role !== 'PROFESSEUR') {
      redirect('/login')
  }

  // Fetch classroom data - USING DUMMY DATA
  const classroom = dummyClassrooms[classroomId];

  if (!classroom) {
    notFound();
  }

  const announcements = await getClassAnnouncements(classroom.id);
  
  return <ClassPageClient classroom={classroom} teacher={session.user} announcements={announcements} />;
}
