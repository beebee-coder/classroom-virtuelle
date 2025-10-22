// src/app/teacher/class/[id]/page.tsx
import { notFound, redirect } from 'next/navigation';
import ClassPageClient from './ClassPageClient';
import { getAuthSession } from '@/lib/session';
import { getClassAnnouncements } from '@/lib/actions/announcement.actions';
import { ClassroomWithDetails, StudentForCard } from '@/lib/types';
import { User } from 'next-auth';


// DUMMY DATA
const allDummyStudents: StudentForCard[] = [
    // Class A
    { id: 'student1', name: 'Ahmed', email: 'ahmed@example.com', points: 1250, image: null, etat: { isPunished: false } },
    { id: 'student2', name: 'Bilel', email: 'bilel@example.com', points: 980, image: null, etat: { isPunished: false } },
    { id: 'student3', name: 'Fatima', email: 'fatima@example.com', points: 1500, image: null, etat: { isPunished: true } },
    { id: 'student4', name: 'Khadija', email: 'khadija@example.com', points: 750, image: null, etat: { isPunished: false } },
    { id: 'student5', name: 'Youssef', email: 'youssef@example.com', points: 1100, image: null, etat: { isPunished: false } },
    { id: 'student6', name: 'Amina', email: 'amina@example.com', points: 850, image: null, etat: { isPunished: false } },
    { id: 'student7', name: 'Omar', email: 'omar@example.com', points: 1300, image: null, etat: { isPunished: false } },
    { id: 'student8', name: 'Leila', email: 'leila@example.com', points: 920, image: null, etat: { isPunished: false } },
    { id: 'student9', name: 'Ibrahim', email: 'ibrahim@example.com', points: 1600, image: null, etat: { isPunished: false } },
    { id: 'student10', name: 'Nora', email: 'nora@example.com', points: 700, image: null, etat: { isPunished: false } },
    // Class B
    { id: 'student11', name: 'Ali', email: 'ali@example.com', points: 1150, image: null, etat: { isPunished: false } },
    { id: 'student12', name: 'Sofia', email: 'sofia@example.com', points: 1050, image: null, etat: { isPunished: false } },
    { id: 'student13', name: 'Mehdi', email: 'mehdi@example.com', points: 1400, image: null, etat: { isPunished: false } },
    { id: 'student14', name: 'Yasmina', email: 'yasmina@example.com', points: 800, image: null, etat: { isPunished: false } },
    { id: 'student15', name: 'Karim', email: 'karim@example.com', points: 1200, image: null, etat: { isPunished: false } },
    { id: 'student16', name: 'Sara', email: 'sara@example.com', points: 950, image: null, etat: { isPunished: false } },
    { id: 'student17', name: 'Hassan', email: 'hassan@example.com', points: 1350, image: null, etat: { isPunished: false } },
    { id: 'student18', name: 'Ines', email: 'ines@example.com', points: 880, image: null, etat: { isPunished: false } },
    { id: 'student19', name: 'Rachid', email: 'rachid@example.com', points: 1700, image: null, etat: { isPunished: false } },
    { id: 'student20', name: 'Samira', email: 'samira@example.com', points: 650, image: null, etat: { isPunished: false } },
    // Class C
    { id: 'student21', name: 'Zayd', email: 'zayd@example.com', points: 1000, image: null, etat: { isPunished: false } },
    { id: 'student22', name: 'Lina', email: 'lina@example.com', points: 1100, image: null, etat: { isPunished: false } },
    { id: 'student23', name: 'Adil', email: 'adil@example.com', points: 1300, image: null, etat: { isPunished: false } },
    { id: 'student24', name: 'Dounia', email: 'dounia@example.com', points: 900, image: null, etat: { isPunished: false } },
    { id: 'student25', name: 'Anis', email: 'anis@example.com', points: 1250, image: null, etat: { isPunished: false } },
    { id: 'student26', name: 'Nadia', email: 'nadia@example.com', points: 980, image: null, etat: { isPunished: false } },
    { id: 'student27', name: 'Ismail', email: 'ismail@example.com', points: 1450, image: null, etat: { isPunished: false } },
    { id: 'student28', name: 'Rania', email: 'rania@example.com', points: 850, image: null, etat: { isPunished: false } },
    { id: 'student29', name: 'Malik', email: 'malik@example.com', points: 1800, image: null, etat: { isPunished: false } },
    { id: 'student30', name: 'Zahra', email: 'zahra@example.com', points: 600, image: null, etat: { isPunished: false } },
];

const dummyClassrooms: { [key: string]: ClassroomWithDetails } = {
    'classe-a': {
        id: 'classe-a',
        nom: 'Classe 6ème A',
        eleves: allDummyStudents.slice(0,10)
    },
    'classe-b': {
        id: 'classe-b',
        nom: 'Classe 6ème B',
        eleves: allDummyStudents.slice(10,20)
    },
    'classe-c': {
        id: 'classe-c',
        nom: 'Classe 5ème A',
        eleves: allDummyStudents.slice(20,30)
    }
};

export default async function ClassPage({ params }: { params: { id: string } }) {
  const classroomId = params.id;
  const session = await getAuthSession();

  if (!session?.user || session.user.role !== 'PROFESSEUR') {
      redirect('/login');
  }

  const user = session.user;

  // Fetch classroom data - USING DUMMY DATA
  const classroom = dummyClassrooms[classroomId];

  if (!classroom) {
    notFound();
  }

  const announcements = await getClassAnnouncements(classroom.id);
  
  return <ClassPageClient classroom={classroom} teacher={user} announcements={announcements} />;
}
