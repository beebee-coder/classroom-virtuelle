// src/app/teacher/student/[id]/page.tsx

import { getAuthSession } from "@/lib/auth";
import { redirect, notFound } from 'next/navigation';
import { getStudentData } from '@/lib/actions/student.actions';
import { getActiveTasks } from '@/lib/actions/task.actions';
import { getMetiers } from '@/lib/actions/teacher.actions';
import StudentPageClient from '@/components/StudentPageClient';
import { getStudentAnnouncements } from '@/lib/actions/announcement.actions';
import { BackButton } from "@/components/BackButton";

export default async function TeacherStudentViewPage({ params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession();
    const viewingUser = session?.user;
    
    if (!viewingUser || viewingUser.role !== 'PROFESSEUR') {
      redirect('/login');
    }

    const student = await getStudentData(params.id);

    if (!student) {
      console.error('❌ [PAGE TEACHER/STUDENT] - Élève non trouvé avec ID:', params.id);
      notFound();
    }
    
    if (student.classe?.professeurId !== viewingUser.id) {
        console.error('❌ [PAGE TEACHER/STUDENT] - Accès non autorisé. Le professeur n\'est pas assigné à la classe de l\'élève.');
        notFound();
    }
    
    const [allCareers, announcements, tasks] = await Promise.all([
      getMetiers(),
      getStudentAnnouncements(student.id),
      getActiveTasks()
    ]);

    return (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-w-0">
             <div className="mb-8">
                <BackButton />
            </div>
            <StudentPageClient
                student={student}
                announcements={announcements}
                allCareers={allCareers}
                isTeacherView={true}
                tasks={tasks}
                user={viewingUser}
            />
        </div>
    );
  } catch (error) {
    console.error('❌ [PAGE TEACHER/STUDENT] - Erreur lors du chargement du profil élève:', error);
    redirect('/teacher/dashboard');
  }
}
