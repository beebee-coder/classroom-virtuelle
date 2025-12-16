// src/app/teacher/class/[id]/page.tsx
import { notFound, redirect } from 'next/navigation';
import ClassPageClient from './ClassPageClient';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getClassAnnouncements } from '@/lib/actions/announcement.actions';
import prisma from '@/lib/prisma';
import type { User, Classroom, Announcement } from '@prisma/client';
import type { ClassroomWithDetails } from '@/types';

type AnnouncementWithAuthor = Announcement & { author: { name: string | null } };

export default async function ClassPage({ params }: { params: { id: string } }) {
  const classroomId = params.id;
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== 'PROFESSEUR') {
      redirect('/login');
  }

  const teacher = await prisma.user.findUnique({
    where: { id: session.user.id }
  });
  
  if (!teacher) {
      console.error("Teacher not found in database, redirecting to login.");
      redirect('/login');
  }

  // ✅ CORRECTION MAJEURE: On récupère la classe ET tous les élèves en attente
  const classroomDataPromise = prisma.classroom.findUnique({
    where: { id: classroomId, professeurId: teacher.id },
    include: {
      eleves: {
        where: { validationStatus: 'VALIDATED' }, // Ne prendre que les élèves déjà validés pour cette classe
        select: {
          id: true, name: true, email: true, image: true, role: true,
          validationStatus: true, points: true,
          etat: { select: { isPunished: true, metierId: true } },
        },
        orderBy: { points: 'desc' }
      },
    },
  });

  const pendingStudentsPromise = prisma.user.findMany({
    where: { 
      role: 'ELEVE',
      validationStatus: 'PENDING',
      classeId: null // Qui ne sont dans aucune classe
    },
     select: {
        id: true, name: true, email: true, image: true, role: true,
        validationStatus: true, points: true,
        etat: { select: { isPunished: true, metierId: true } },
     }
  });

  const [classroom, pendingStudents] = await Promise.all([
    classroomDataPromise,
    pendingStudentsPromise
  ]);

  if (!classroom) {
    notFound();
  }

  // On fusionne les élèves de la classe et les élèves en attente pour la vue client
  const allStudentsForView = [...classroom.eleves, ...pendingStudents];
  const classroomWithAllStudents = {
    ...classroom,
    eleves: allStudentsForView,
  };

  const announcements = await getClassAnnouncements(classroom.id) as AnnouncementWithAuthor[];
  
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-w-0">
      <ClassPageClient classroom={classroomWithAllStudents as ClassroomWithDetails} teacher={teacher} announcements={announcements} />
    </div>
  );
}
