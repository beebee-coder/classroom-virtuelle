
// src/app/student/dashboard/page.tsx
import { Header } from '@/components/Header';
import { notFound, redirect } from 'next/navigation';
import { CareerThemeWrapper } from '@/components/CareerThemeWrapper';
import { StudentWithStateAndCareer, AppTask } from '@/lib/types';
import { getAuthSession } from '@/lib/session';
import { ChatSheet } from '@/components/ChatSheet';
import { getStudentAnnouncements } from '@/lib/actions/announcement.actions';
import StudentPageClient from '@/components/StudentPageClient';
import { Sidebar, SidebarContent, SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import Menu from '@/components/Menu';
import { Metier, CoursSession, StudentProgress, TaskType, TaskCategory, TaskDifficulty, ValidationType, ProgressStatus } from '@prisma/client';

// DUMMY DATA
const dummyCareers: Metier[] = [
    { id: 'pompier', nom: 'Pompier', description: 'Sauve des vies et combat le feu.', icon: 'Flame', theme: { backgroundColor: 'from-red-500 to-orange-500', textColor: 'text-white', primaryColor: '22 84% 44%', accentColor: '45 93% 47%', cursor: 'cursor-crosshair' } as any },
    { id: 'astronaute', nom: 'Astronaute', description: 'Explore l\'espace et les étoiles.', icon: 'Rocket', theme: { backgroundColor: 'from-blue-800 to-indigo-900', textColor: 'text-white', primaryColor: '217 91% 60%', accentColor: '262 84% 60%', cursor: 'cursor-pointer' } as any },
    { id: 'devjeux', nom: 'DevJeux', description: 'Crée des mondes virtuels.', icon: 'Gamepad2', theme: { backgroundColor: 'from-purple-600 to-blue-600', textColor: 'text-white', primaryColor: '250 84% 60%', accentColor: '280 84% 60%', cursor: 'cursor-grab' } as any },
];

const dummyTasks: AppTask[] = [
    { id: 'task1', title: 'Faire son lit', description: 'Un lit bien fait...', points: 10, type: 'DAILY', category: 'HOME', difficulty: 'EASY', validationType: 'PARENT', requiresProof: false, attachmentUrl: null, isActive: true, startTime: null, duration: null },
    { id: 'task2', title: 'Lire 15 minutes', description: 'Un chapitre par jour...', points: 15, type: 'DAILY', category: 'LANGUAGE', difficulty: 'EASY', validationType: 'PARENT', requiresProof: false, attachmentUrl: null, isActive: true, startTime: null, duration: null },
    { id: 'task3', title: 'Ranger sa chambre', description: 'Un espace propre...', points: 50, type: 'WEEKLY', category: 'HOME', difficulty: 'MEDIUM', validationType: 'PARENT', requiresProof: true, attachmentUrl: null, isActive: true, startTime: null, duration: null },
    { id: 'task4', title: 'Exercice de maths', description: 'Résoudre une série...', points: 70, type: 'WEEKLY', category: 'MATH', difficulty: 'MEDIUM', validationType: 'PROFESSOR', requiresProof: true, attachmentUrl: null, isActive: true, startTime: null, duration: null },
];

const dummyProgress: StudentProgress[] = [
    { id: 'p1', studentId: 'student1', taskId: 'task1', status: 'VERIFIED', completionDate: new Date(), pointsAwarded: 10, submissionUrl: null, accuracy: 100, recipeName: null, },
    { id: 'p2', studentId: 'student1', taskId: 'task3', status: 'PENDING_VALIDATION', completionDate: new Date(), pointsAwarded: 0, submissionUrl: 'https://example.com/proof', accuracy: null, recipeName: null, }
];

const dummyStudentData: { [id: string]: StudentWithStateAndCareer } = {
  'student1': {
    id: 'student1', name: 'Alice', email: 'student1@example.com', points: 1250, ambition: 'Devenir Astronaute', classroomId: 'classe-a', image: null, emailVerified: null, parentPassword: 'password', role: 'ELEVE',
    etat: { id: 'etat1', eleveId: 'student1', isPunished: false, metierId: 'astronaute', metier: dummyCareers[1] },
    classe: { id: 'classe-a', nom: 'Classe 6ème A', professeurId: 'teacher-id' },
    progress: dummyProgress,
    sessionsParticipees: []
  },
   'teacher@example.com': {
    id: 'teacher-id', name: 'Professeur Test', email: 'teacher@example.com', role: 'PROFESSEUR', image: null,
  } as any,
   'student@example.com': {
    id: 'student1', name: 'Alice', email: 'student1@example.com', points: 1250, ambition: 'Devenir Astronaute', classroomId: 'classe-a', image: null, emailVerified: null, parentPassword: 'password', role: 'ELEVE',
    etat: { id: 'etat1', eleveId: 'student1', isPunished: false, metierId: 'astronaute', metier: dummyCareers[1] },
    classe: { id: 'classe-a', nom: 'Classe 6ème A', professeurId: 'teacher-id' },
    progress: dummyProgress,
    sessionsParticipees: []
  },
  'student1@example.com': {
    id: 'student1', name: 'Alice', email: 'student1@example.com', points: 1250, ambition: 'Devenir Astronaute', classroomId: 'classe-a', image: null, emailVerified: null, parentPassword: 'password', role: 'ELEVE',
    etat: { id: 'etat1', eleveId: 'student1', isPunished: false, metierId: 'astronaute', metier: dummyCareers[1] },
    classe: { id: 'classe-a', nom: 'Classe 6ème A', professeurId: 'teacher-id' },
    progress: dummyProgress,
    sessionsParticipees: []
  },
  'student2': {
    id: 'student2', name: 'Bob', email: 'student2@example.com', points: 980, ambition: 'Explorer les fonds marins', classroomId: 'classe-a', image: null, emailVerified: null, parentPassword: null, role: 'ELEVE',
    etat: { id: 'etat2', eleveId: 'student2', isPunished: false, metierId: null, metier: null },
    classe: { id: 'classe-a', nom: 'Classe 6ème A', professeurId: 'teacher-id' },
    progress: [],
    sessionsParticipees: []
  },
};


async function getStudentData(id: string): Promise<StudentWithStateAndCareer | null> {
    // DUMMY DATA
    return dummyStudentData[id] || dummyStudentData['student1'];
}

export default async function StudentDashboardPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const student = await getStudentData(session.user.id);
  const viewAs = searchParams.viewAs;
  const isTeacherView = viewAs === 'teacher' && session.user.role === 'PROFESSEUR';

  if (!student) {
    notFound();
  }
  
  // Security: a student can only see their own page
  if (session.user.role === 'ELEVE' && student.id !== session.user.id) {
      // In dummy mode, let's just log this instead of blocking
      console.warn(`[SECURITY] Student ${session.user.id} tried to access page of ${student.id}`);
  }


  const metier = student.etat?.metier;
  const allCareers = isTeacherView ? dummyCareers : [];
  
  const classeId = student.classe?.id;
  const announcements = await getStudentAnnouncements(student.id);
  
  const tasks = dummyTasks;

  return (
    <CareerThemeWrapper career={metier ?? undefined}>
      <SidebarProvider>
        <div className="flex flex-col min-h-screen">
          <Header user={session.user}>
              {!isTeacherView && <SidebarTrigger />}
              {classeId && !isTeacherView && session.user.role && (
                  <ChatSheet classroomId={classeId} userId={session.user.id} userRole={session.user.role} />
              )}
          </Header>
          <div className="flex flex-1">
            {!isTeacherView && (
              <Sidebar>
                <SidebarContent>
                  <Menu user={session.user} />
                </SidebarContent>
              </Sidebar>
            )}
            <SidebarInset>
              <StudentPageClient
                  student={student}
                  announcements={announcements}
                  allCareers={allCareers}
                  isTeacherView={isTeacherView}
                  tasks={tasks}
              />
            </SidebarInset>
          </div>
        </div>
      </SidebarProvider>
    </CareerThemeWrapper>
  );
}

    