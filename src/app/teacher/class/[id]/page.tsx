// src/app/teacher/class/[id]/page.tsx
import { notFound, redirect } from 'next/navigation';
import ClassPageClient from './ClassPageClient';
import { getAuthSession } from '@/lib/session';
import { getClassAnnouncements } from '@/lib/actions/announcement.actions';
import prisma from '@/lib/prisma';
import type { User, Classroom, Announcement, EtatEleve } from '@prisma/client';

type ClassroomWithStudentsAndPunishment = Classroom & {
    eleves: (User & {
        etat: { isPunished: boolean } | null;
    })[];
};

type AnnouncementWithAuthor = Announcement & { author: { name: string | null } };

export default async function ClassPage({ params }: { params: { id: string } }) {
  const classroomId = params.id;
  const session = await getAuthSession();

  if (!session?.user || session.user.role !== 'PROFESSEUR') {
      redirect('/login');
  }

  const user = session.user;

  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId, professeurId: user.id },
    include: {
      eleves: {
        include: {
          etat: {
            select: {
              isPunished: true,
            },
          },
        },
        orderBy: {
            points: 'desc'
        }
      },
    },
  });

  if (!classroom) {
    notFound();
  }

  const announcements = await getClassAnnouncements(classroom.id) as AnnouncementWithAuthor[];
  
  return <ClassPageClient classroom={classroom as ClassroomWithStudentsAndPunishment} teacher={user} announcements={announcements} />;
}
