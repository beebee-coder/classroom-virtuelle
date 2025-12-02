
// src/app/teacher/student/[id]/page.tsx

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect, notFound } from 'next/navigation';
import { getStudentData } from '@/lib/actions/student.actions';
import StudentPageClient from '@/components/StudentPageClient';
import { getStudentAnnouncements } from '@/lib/actions/announcement.actions';
import prisma from '@/lib/prisma';
import type { User, Metier, Announcement, StudentProgress, Task, Classroom, EtatEleve } from '@prisma/client';
import { BackButton } from "@/components/BackButton";

// Type cohérent avec getStudentData
type StudentWithDetails = User & {
    classe: Classroom | null;
    etat: (EtatEleve & { metier: Metier | null }) | null;
    studentProgress: StudentProgress[];
};

type AnnouncementWithAuthor = Announcement & {
    author: { name: string | null };
};

export default async function TeacherStudentViewPage({ params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const viewingUser = session?.user;
    
    // Seul le professeur peut accéder à cette page
    if (!viewingUser || viewingUser.role !== 'PROFESSEUR') {
      redirect('/login');
    }

    const student = await getStudentData(params.id);

    if (!student) {
      console.error('❌ [PAGE TEACHER/STUDENT] - Élève non trouvé avec ID:', params.id);
      notFound();
    }
    
    // Le professeur doit être le professeur de la classe de l'élève pour voir le profil
    if (student.classe?.professeurId !== viewingUser.id) {
        console.error('❌ [PAGE TEACHER/STUDENT] - Accès non autorisé. Le professeur n\'est pas assigné à la classe de l\'élève.');
        notFound();
    }
    
    const allCareers = await prisma.metier.findMany();
    const announcements = await getStudentAnnouncements(student.id);
    const tasks = await prisma.task.findMany({ where: { isActive: true } });

    return (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-w-0">
             <div className="mb-8">
                <BackButton />
            </div>
            <StudentPageClient
                student={student}
                announcements={announcements}
                allCareers={allCareers}
                isTeacherView={true} // Vue forcée en mode professeur
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
