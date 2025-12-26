// src/app/teacher/class/[id]/page.tsx
import { notFound, redirect } from 'next/navigation';
import ClassPageClient from './ClassPageClient';
import { getAuthSession } from "@/lib/auth";
import { getClassAnnouncements } from '@/lib/actions/announcement.actions';
import { getClassroomWithDetailsAndTeacher } from '@/lib/actions/classroom.actions';
import type { ClassroomWithDetails } from '@/types';

export default async function ClassPage({ params }: { params: { id: string } }) {
  const classroomId = params.id;
  const session = await getAuthSession();

  if (!session?.user || session.user.role !== 'PROFESSEUR') {
      redirect('/login');
  }

  const { classroom, teacher } = await getClassroomWithDetailsAndTeacher(classroomId, session.user.id);
  
  if (!classroom || !teacher) {
      notFound();
  }

  const announcements = await getClassAnnouncements(classroom.id);
  
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-w-0">
      <ClassPageClient classroom={classroom as ClassroomWithDetails} teacher={teacher} announcements={announcements} />
    </div>
  );
}
