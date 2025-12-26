
// src/app/student/class/[id]/page.tsx
import { notFound, redirect } from 'next/navigation';
import { getAuthSession } from "@/lib/auth";
import { Header } from '@/components/Header';
import { StudentClassView } from '@/components/StudentClassView';
import { getClassroomWithStudents, getCurrentUserForClassPage } from '@/lib/actions/classroom.actions';
import { ChatSheet } from '@/components/ChatSheet';
import type { User, Classroom, EtatEleve } from '@prisma/client';

export type ClassroomWithStudents = Classroom & {
    eleves: (User & {
        etat: EtatEleve | null;
    })[];
};

export default async function StudentClassPage({ params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session?.user) {
    redirect('/login');
  }

  const classroomId = params.id;
  
  const [classroom, currentUser] = await Promise.all([
    getClassroomWithStudents(classroomId),
    getCurrentUserForClassPage(session.user.id)
  ]);

  if (!classroom || !currentUser) {
    notFound();
  }

  if (session.user.role === 'ELEVE' && session.user.classeId !== classroom.id) {
    notFound();
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header >
        <ChatSheet classroomId={classroom.id} userId={currentUser.id} userRole={currentUser.role} />
      </Header>
      <StudentClassView 
        classroom={classroom as ClassroomWithStudents} 
        currentUser={currentUser}
      />
    </div>
  );
}
