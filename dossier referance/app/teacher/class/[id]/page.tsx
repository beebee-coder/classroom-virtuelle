// src/app/teacher/class/[id]/page.tsx
import prisma from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import ClassPageClient from './ClassPageClient';
import { getAuthSession } from '@/lib/session';
import { getClassAnnouncements } from '@/lib/actions/announcement.actions';
import { ClassroomWithDetails } from '@/lib/types';
import { User } from '@prisma/client';

export default async function ClassPage({ params }: { params: { id: string } }) {
  const classroomId = params.id;
  const session = await getAuthSession();

  if (!session || session.user.role !== 'PROFESSEUR') {
      redirect('/login')
  }

  const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId, professeurId: session.user.id },
      include: {
        eleves: {
          include: {
            etat: {
              select: {
                isPunished: true,
              }
            }
          },
          orderBy: { name: 'asc' }
        },
      },
    });

  if (!classroom) {
    notFound();
  }

  const announcements = await getClassAnnouncements(classroom.id);
  
  // Cast the fetched data to our specific client-side type
  const clientClassroom: ClassroomWithDetails = {
    id: classroom.id,
    nom: classroom.nom,
    eleves: classroom.eleves.map((e: User) => ({
      id: e.id,
      name: e.name,
      email: e.email,
      points: e.points,
      etat: { isPunished: (e as any).etat?.isPunished ?? false },
    }))
  };

  return <ClassPageClient classroom={clientClassroom} teacher={session.user} announcements={announcements} />;
}
