// src/app/student/class/[id]/page.tsx - VERSION CORRIGÉE
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { Header } from '@/components/Header';
import { StudentClassView } from '@/components/StudentClassView';
import type { User, Classroom, EtatEleve } from '@prisma/client';
import prisma from '@/lib/prisma';
import { ChatSheet } from '@/components/ChatSheet';

export type ClassroomWithStudents = Classroom & {
    eleves: (User & {
        etat: EtatEleve | null;
    })[];
};

export default async function StudentClassPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }

  const classroomId = params.id;
  
  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
    include: {
        eleves: {
            include: {
                etat: true,
            },
            orderBy: {
                points: 'desc'
            }
        }
    }
  });

  if (!classroom) {
    notFound();
  }

  // Security check: ensure the logged-in student is part of this class
  if (session.user.role === 'ELEVE' && session.user.classeId !== classroom.id) {
    notFound();
  }

  // CORRECTION: Récupérer l'utilisateur complet depuis la base de données
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!currentUser) {
    redirect('/login');
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header user={session.user}>
        {currentUser.classeId && currentUser.role && (
          <ChatSheet classroomId={currentUser.classeId} userId={currentUser.id} userRole={currentUser.role} />
        )}
      </Header>
      {/* CORRECTION: Passage de l'utilisateur complet avec le bon type */}
      <StudentClassView 
        classroom={classroom as ClassroomWithStudents} 
        currentUser={currentUser as User}
      />
    </div>
  );
}
