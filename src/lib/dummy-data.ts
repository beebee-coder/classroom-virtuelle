
// src/lib/dummy-data.ts
import { StudentWithStateAndCareer, AppTask, Metier, StudentForCard, ClassroomWithDetails, StudentProgress } from '@/lib/types';
import { Role, ProgressStatus, TaskType, TaskCategory, TaskDifficulty, ValidationType } from '@prisma/client';


export const dummyCareers: Metier[] = [
    { id: 'pompier', nom: 'Pompier', description: 'Sauve des vies et combat le feu.', icon: 'Flame', theme: '{"backgroundColor":"from-red-500 to-orange-500","textColor":"text-white","primaryColor":"22 84% 44%","accentColor":"45 93% 47%","cursor":"cursor-crosshair"}' },
    { id: 'astronaute', nom: 'Astronaute', description: 'Explore l\'espace et les étoiles.', icon: 'Rocket', theme: '{"backgroundColor":"from-blue-800 to-indigo-900","textColor":"text-white","primaryColor":"217 91% 60%","accentColor":"262 84% 60%","cursor":"cursor-pointer"}' },
    { id: 'devjeux', nom: 'DevJeux', description: 'Crée des mondes virtuels.', icon: 'Gamepad2', theme: '{"backgroundColor":"from-purple-600 to-blue-600","textColor":"text-white","primaryColor":"250 84% 60%","accentColor":"280 84% 60%","cursor":"cursor-grab"}' },
];

export const dummyTasks: AppTask[] = [
    { id: 'task1', title: 'Faire son lit', description: 'Un lit bien fait...', points: 10, type: 'DAILY', category: 'HOME', difficulty: 'EASY', validationType: 'PARENT', requiresProof: false, attachmentUrl: null, isActive: true, startTime: null, duration: null, createdAt: new Date(), updatedAt: new Date() },
    { id: 'task2', title: 'Lire 15 minutes', description: 'Un chapitre par jour...', points: 15, type: 'DAILY', category: 'LANGUAGE', difficulty: 'EASY', validationType: 'PARENT', requiresProof: false, attachmentUrl: null, isActive: true, startTime: null, duration: null, createdAt: new Date(), updatedAt: new Date() },
    { id: 'task3', title: 'Ranger sa chambre', description: 'Un espace propre...', points: 50, type: 'WEEKLY', category: 'HOME', difficulty: 'MEDIUM', validationType: 'PARENT', requiresProof: true, attachmentUrl: null, isActive: true, startTime: null, duration: null, createdAt: new Date(), updatedAt: new Date() },
    { id: 'task4', title: 'Exercice de maths', description: 'Résoudre une série...', points: 70, type: 'WEEKLY', category: 'MATH', difficulty: 'MEDIUM', validationType: 'PROFESSOR', requiresProof: true, attachmentUrl: null, isActive: true, startTime: null, duration: null, createdAt: new Date(), updatedAt: new Date() },
];

const studentProgress: StudentProgress[] = [
    { id: 'p1', studentId: 'student1', taskId: 'task1', status: 'VERIFIED', completionDate: new Date(), pointsAwarded: 10, submissionUrl: null, accuracy: 100, recipeName: null, createdAt: new Date(), updatedAt: new Date() },
    { id: 'p2', studentId: 'student1', taskId: 'task3', status: 'PENDING_VALIDATION', completionDate: new Date(), pointsAwarded: 0, submissionUrl: 'https://example.com/proof', accuracy: null, recipeName: null, createdAt: new Date(), updatedAt: new Date() }
];

type TempStudent = {
    id: string;
    name: string;
    email: string;
    points: number;
    ambition: string | null;
    classroomId: string;
    image: string | null;
    emailVerified: Date | null;
    parentPassword: string | null;
    role: Role;
    etat: {
        id: string;
        eleveId: string;
        isPunished: boolean;
        metierId: string | null;
        metier: Metier | null;
    } | null;
    classe: {
        id: string;
        nom: string;
        professeurId: string;
    } | null;
    progress: StudentProgress[];
    sessionsParticipees: any[];
};


export const allDummyStudents: TempStudent[] = [
    { 
        id: 'student1', 
        name: 'Ahmed', 
        email: 'ahmed@example.com', 
        points: 1250, 
        ambition: 'Devenir Astronaute', 
        classroomId: 'classe-a', 
        image: null, 
        emailVerified: null, 
        parentPassword: 'password', 
        role: 'ELEVE', 
        etat: { 
            id: 'etat1', 
            eleveId: 'student1', 
            isPunished: false, 
            metierId: 'astronaute', 
            metier: dummyCareers[1] 
        }, 
        classe: { 
            id: 'classe-a', 
            nom: 'Classe 6ème A', 
            professeurId: 'teacher-id' 
        }, 
        progress: studentProgress, 
        sessionsParticipees: [] 
    },
    { 
        id: 'student2', 
        name: 'Bilel', 
        email: 'bilel@example.com', 
        points: 980, 
        ambition: 'Explorer les fonds marins', 
        classroomId: 'classe-a', 
        image: null, 
        emailVerified: null, 
        parentPassword: null, 
        role: 'ELEVE', 
        etat: { 
            id: 'etat2', 
            eleveId: 'student2', 
            isPunished: false, 
            metierId: null, 
            metier: null 
        }, 
        classe: { 
            id: 'classe-a', 
            nom: 'Classe 6ème A', 
            professeurId: 'teacher-id' 
        }, 
        progress: [], 
        sessionsParticipees: [] 
    },
    { 
        id: 'student3', 
        name: 'Fatima', 
        email: 'fatima@example.com', 
        points: 1500, 
        ambition: 'Créer des jeux vidéo', 
        classroomId: 'classe-a', 
        image: null, 
        emailVerified: null, 
        parentPassword: null, 
        role: 'ELEVE', 
        etat: { 
            id: 'etat3', 
            eleveId: 'student3', 
            isPunished: true, 
            metierId: 'devjeux', 
            metier: dummyCareers[2] 
        }, 
        classe: { 
            id: 'classe-a', 
            nom: 'Classe 6ème A', 
            professeurId: 'teacher-id' 
        }, 
        progress: [], 
        sessionsParticipees: [] 
    },
    { 
        id: 'student4', 
        name: 'Khadija', 
        email: 'khadija@example.com', 
        points: 750, 
        ambition: 'Devenir chef cuisinier', 
        classroomId: 'classe-a', 
        image: null, 
        emailVerified: null, 
        parentPassword: null, 
        role: 'ELEVE', 
        etat: { 
            id: 'etat4', 
            eleveId: 'student4', 
            isPunished: false, 
            metierId: null, 
            metier: null 
        }, 
        classe: { 
            id: 'classe-a', 
            nom: 'Classe 6ème A', 
            professeurId: 'teacher-id' 
        }, 
        progress: [], 
        sessionsParticipees: [] 
    },
    { 
        id: 'student5', 
        name: 'Youssef', 
        email: 'youssef@example.com', 
        points: 1100, 
        ambition: 'Être un grand artiste', 
        classroomId: 'classe-a', 
        image: null, 
        emailVerified: null, 
        parentPassword: null, 
        role: 'ELEVE', 
        etat: { 
            id: 'etat5', 
            eleveId: 'student5', 
            isPunished: false, 
            metierId: null, 
            metier: null 
        }, 
        classe: { 
            id: 'classe-a', 
            nom: 'Classe 6ème A', 
            professeurId: 'teacher-id' 
        }, 
        progress: [], 
        sessionsParticipees: [] 
    },
    { 
        id: 'student6', 
        name: 'Amina', 
        email: 'amina@example.com', 
        points: 850, 
        ambition: 'Protéger la nature', 
        classroomId: 'classe-a', 
        image: null, 
        emailVerified: null, 
        parentPassword: null, 
        role: 'ELEVE', 
        etat: { 
            id: 'etat6', 
            eleveId: 'student6', 
            isPunished: false, 
            metierId: null, 
            metier: null 
        }, 
        classe: { 
            id: 'classe-a', 
            nom: 'Classe 6ème A', 
            professeurId: 'teacher-id' 
        }, 
        progress: [], 
        sessionsParticipees: [] 
    },
    { 
        id: 'student7', 
        name: 'Omar', 
        email: 'omar@example.com', 
        points: 1300, 
        ambition: 'Construire des robots', 
        classroomId: 'classe-a', 
        image: null, 
        emailVerified: null, 
        parentPassword: null, 
        role: 'ELEVE', 
        etat: { 
            id: 'etat7', 
            eleveId: 'student7', 
            isPunished: false, 
            metierId: null, 
            metier: null 
        }, 
        classe: { 
            id: 'classe-a', 
            nom: 'Classe 6ème A', 
            professeurId: 'teacher-id' 
        }, 
        progress: [], 
        sessionsParticipees: [] 
    },
    { 
        id: 'student8',
        name: 'Leila', 
        email: 'leila@example.com', 
        points: 920, 
        ambition: 'Soigner les animaux', 
        classroomId: 'classe-a', 
        image: null, 
        emailVerified: null, 
        parentPassword: null, 
        role: 'ELEVE', 
        etat: { 
            id: 'etat8', 
            eleveId: 'student8', 
            isPunished: false, 
            metierId: null, 
            metier: null 
        }, 
        classe: { 
            id: 'classe-a', 
            nom: 'Classe 6ème A', 
            professeurId: 'teacher-id' 
        }, 
        progress: [], 
        sessionsParticipees: [] 
    },
    { 
        id: 'student9', 
        name: 'Ibrahim', 
        email: 'ibrahim@example.com', 
        points: 1600, 
        ambition: 'Devenir pompier', 
        classroomId: 'classe-a', 
        image: null, 
        emailVerified: null, 
        parentPassword: null, 
        role: 'ELEVE', 
        etat: { 
            id: 'etat9', 
            eleveId: 'student9', 
            isPunished: false, 
            metierId: 'pompier', 
            metier: dummyCareers[0] 
        }, 
        classe: { 
            id: 'classe-a', 
            nom: 'Classe 6ème A', 
            professeurId: 'teacher-id' 
        }, 
        progress: [], 
        sessionsParticipees: [] 
    },
    { 
        id: 'student10', 
        name: 'Nora', 
        email: 'nora@example.com', 
        points: 700, 
        ambition: 'Voyager dans le temps', 
        classroomId: 'classe-a', 
        image: null, 
        emailVerified: null, 
        parentPassword: null, 
        role: 'ELEVE', 
        etat: { 
            id: 'etat10', 
            eleveId: 'student10', 
            isPunished: false, 
            metierId: null, 
            metier: null 
        }, 
        classe: { 
            id: 'classe-a', 
            nom: 'Classe 6ème A', 
            professeurId: 'teacher-id' 
        }, 
        progress: [], 
        sessionsParticipees: [] 
    },
    // --- Class B ---
    { 
        id: 'student11', 
        name: 'Ali', 
        email: 'ali@example.com', 
        points: 1150, 
        ambition: 'Piloter des avions', 
        classroomId: 'classe-b', 
        image: null, 
        emailVerified: null, 
        parentPassword: null, 
        role: 'ELEVE', 
        etat: { 
            id: 'etat11', 
            eleveId: 'student11', 
            isPunished: false, 
            metierId: null, 
            metier: null 
        }, 
        classe: { 
            id: 'classe-b', 
            nom: 'Classe 6ème B', 
            professeurId: 'teacher-id' 
        }, 
        progress: [], 
        sessionsParticipees: [] 
    },
    { 
        id: 'student12', 
        name: 'Sofia',
        email: 'sofia@example.com', 
        points: 1050, 
        ambition: 'Écrire des histoires', 
        classroomId: 'classe-b', 
        image: null, 
        emailVerified: null, 
        parentPassword: null, 
        role: 'ELEVE', 
        etat: { 
            id: 'etat12', 
            eleveId: 'student12', 
            isPunished: false, 
            metierId: null, 
            metier: null 
        }, 
        classe: { 
            id: 'classe-b', 
            nom: 'Classe 6ème B', 
            professeurId: 'teacher-id' 
        }, 
        progress: [], 
        sessionsParticipees: [] 
    },
    // --- Class C ---
    { 
        id: 'student21', 
        name: 'Zayd', 
        email: 'zayd@example.com', 
        points: 1000, 
        ambition: 'Découvrir des trésors', 
        classroomId: 'classe-c', 
        image: null, 
        emailVerified: null, 
        parentPassword: null, 
        role: 'ELEVE', 
        etat: { 
            id: 'etat21', 
            eleveId: 'student21', 
            isPunished: false, 
            metierId: null, 
            metier: null 
        }, 
        classe: { 
            id: 'classe-c', 
            nom: 'Classe 5ème A', 
            professeurId: 'teacher-id' 
        }, 
        progress: [], 
        sessionsParticipees: [] 
    },
    { 
        id: 'student22', 
        name: 'Lina', 
        email: 'lina@example.com', 
        points: 1100, 
        ambition: 'Dessiner des mangas', 
        classroomId: 'classe-c', 
        image: null, 
        emailVerified: null, 
        parentPassword: null, 
        role: 'ELEVE', 
        etat: { 
            id: 'etat22', 
            eleveId: 'student22', 
            isPunished: false, 
            metierId: null, 
            metier: null 
        }, 
        classe: { 
            id: 'classe-c', 
            nom: 'Classe 5ème A', 
            professeurId: 'teacher-id' 
        }, 
        progress: [], 
        sessionsParticipees: [] 
    },
];

// Conversion avec assertion de type pour éviter les erreurs
export const dummyStudentData: { [id: string]: StudentWithStateAndCareer } = allDummyStudents.reduce((acc, student) => {
    acc[student.id] = student as unknown as StudentWithStateAndCareer;
    return acc;
}, {} as { [id: string]: StudentWithStateAndCareer });

function mapToStudentForCard(student: TempStudent): StudentForCard {
    return {
        id: student.id,
        name: student.name,
        email: student.email,
        image: student.image,
        points: student.points,
        etat: student.etat ? { isPunished: student.etat.isPunished } : null
    };
}

export const dummyClassrooms: { [key: string]: ClassroomWithDetails } = {
    'classe-a': {
        id: 'classe-a',
        nom: 'Classe 6ème A',
        eleves: allDummyStudents.filter(s => s.classroomId === 'classe-a').map(mapToStudentForCard),
    },
    'classe-b': {
        id: 'classe-b',
        nom: 'Classe 6ème B',
        eleves: allDummyStudents.filter(s => s.classroomId === 'classe-b').map(mapToStudentForCard),
    },
    'classe-c': {
        id: 'classe-c',
        nom: 'Classe 5ème A',
        eleves: allDummyStudents.filter(s => s.classroomId === 'classe-c').map(mapToStudentForCard),
    }
};

export const lightClassrooms = Object.values(dummyClassrooms).map(c => ({
    id: c.id,
    nom: c.nom,
    _count: { eleves: c.eleves.length }
}));
