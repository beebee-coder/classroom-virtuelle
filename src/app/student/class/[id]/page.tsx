
//src/app/student/class/[id]/page.tsx

import { notFound, redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/session';
import { Header } from '@/components/Header';
import { StudentClassView } from '@/components/StudentClassView';
import { User } from '@prisma/client';
import { StudentForCard } from '@/lib/types';


export type ClassroomWithStudents = {
    id: string;
    nom: string;
    eleves: (User & {
        etat: {
            isPunished: boolean;
        } | null;
    })[];
};

// DUMMY DATA
const dummyStudents: StudentForCard[] = [
    { id: 'student1', name: 'Alice', email: 'student1@example.com', points: 1250, etat: { isPunished: false } },
    { id: 'student2', name: 'Bob', email: 'student2@example.com', points: 980, etat: { isPunished: false } },
];

const dummyClassroom: ClassroomWithStudents = {
    id: 'classe-a',
    nom: 'Classe 6ème A',
    eleves: dummyStudents as any,
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
      <StudentClassView classroom={classroom as any} />
    </>
  );
}
