
//src/app/student/class/[id]/page.tsx

import { notFound, redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getAuthSession } from '@/lib/session';
import { Header } from '@/components/Header';
import { StudentClassView } from '@/components/StudentClassView';
import {  User, Classroom } from '@prisma/client';

export type ClassroomWithStudents = Classroom & {
    eleves: (User & {
        etat: {
            isPunished: boolean;
        } | null;
    })[];
};


export default async function StudentClassPage({ params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session?.user) {
    redirect('/login');
  }

  const classroomId = params.id;

  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
    include: {
      eleves: {
        include: {
          etat: {
            select: {
              isPunished: true,
            },
          },
        },
        orderBy: { points: 'desc' },
      },
    },
  });

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
      <StudentClassView classroom={classroom as ClassroomWithStudents} />
    </>
  );
}
