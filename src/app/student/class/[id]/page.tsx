//src/app/student/class/[id]/page.tsx

import { notFound, redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/session';
import { Header } from '@/components/Header';
import { StudentClassView } from '@/components/StudentClassView';
import type { User, Classroom, EtatEleve } from '@prisma/client';

export type ClassroomWithStudents = Classroom & {
    eleves: (User & {
        etat: EtatEleve | null;
    })[];
};

// DUMMY DATA
const dummyStudents: (User & { etat: EtatEleve | null })[] = [
    { id: 'student1', name: 'Alice', email: 'student1@example.com', points: 1250, image: null, etat: { id: '1', eleveId: 'student1', isPunished: false, metierId: null }, ambition: 'Devenir Astronaute', classeId: 'classe-a', emailVerified: null, parentPassword: null, role: 'ELEVE' },
    { id: 'student2', name: 'Bob', email: 'student2@example.com', points: 980, image: null, etat: { id: '2', eleveId: 'student2', isPunished: false, metierId: null }, ambition: 'Explorer les fonds marins', classeId: 'classe-a', emailVerified: null, parentPassword: null, role: 'ELEVE' },
];

const dummyClassroom: ClassroomWithStudents = {
    id: 'classe-a',
    nom: 'Classe 6ème A',
    professeurId: 'teacher-id',
    eleves: dummyStudents,
};


export default async function StudentClassPage({ params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session?.user) {
    redirect('/login');
  }

  const classroomId = params.id;
  const classroom = classroomId === dummyClassroom.id ? dummyClassroom : null;

  if (!classroom) {
    notFound();
  }

  // Security check: ensure the logged-in student is part of this class
  if (session.user.role === 'ELEVE' && session.user.classeId !== classroom.id) {
    notFound();
  }

  return (
    <>
      <Header user={session.user} />
      <StudentClassView classroom={classroom} />
    </>
  );
}
