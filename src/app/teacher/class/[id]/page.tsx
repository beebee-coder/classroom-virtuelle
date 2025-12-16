

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

  // Fetch the full teacher user object from the database
  const teacher = await prisma.user.findUnique({
    where: { id: session.user.id }
  });
  
  if (!teacher) {
      console.error("Teacher not found in database, redirecting to login.");
      redirect('/login');
  }

  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId, professeurId: teacher.id },
    include: {
      eleves: {
        include: {
          etat: {
            select: {
              isPunished: true,
              metierId: true, // pour le style des cartes
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
  
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-w-0">
      <ClassPageClient classroom={classroom as ClassroomWithDetails} teacher={teacher} announcements={announcements} />
    </div>
  );
}
