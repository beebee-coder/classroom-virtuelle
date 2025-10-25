// src/lib/types.ts
// On supprime les enums et interfaces manuels pour utiliser directement les types générés par Prisma.
// Cela garantit que nos types sont toujours synchronisés avec le schéma de la base de données.

import type { 
    User as PrismaUser,
    Classroom as PrismaClassroom,
    Metier as PrismaMetier,
    CoursSession as PrismaCoursSession,
    Task as PrismaTask,
    StudentProgress as PrismaStudentProgress,
    Reaction as PrismaReaction,
    Message as PrismaMessage,
    Announcement as PrismaAnnouncement,
    EtatEleve as PrismaEtatEleve,
    Role as PrismaRole,
    TaskType as PrismaTaskType,
    TaskCategory as PrismaTaskCategory,
    TaskDifficulty as PrismaTaskDifficulty,
    ValidationType as PrismaValidationType,
    ProgressStatus as PrismaProgressStatus
} from '@prisma/client';

// Exporter les enums directement depuis Prisma
export { 
    PrismaRole as Role,
    PrismaTaskType as TaskType,
    PrismaTaskCategory as TaskCategory,
    PrismaTaskDifficulty as TaskDifficulty,
    PrismaValidationType as ValidationType,
    PrismaProgressStatus as ProgressStatus
};

// Exporter les types de modèles de base
export type User = PrismaUser;
export type Classroom = PrismaClassroom;
export type Metier = PrismaMetier;
export type CoursSession = PrismaCoursSession;
export type Task = PrismaTask;
export type StudentProgress = PrismaStudentProgress;
export type Reaction = PrismaReaction;
export type Message = PrismaMessage;
export type Announcement = PrismaAnnouncement;
export type EtatEleve = PrismaEtatEleve;

// Types complexes qui étaient basés sur les relations Prisma
export type SessionParticipant = Pick<User, 'id' | 'name' | 'role'>;

export type StudentWithStateAndCareer = User & {
    etat: (PrismaEtatEleve & { metier: PrismaMetier | null }) | null;
    classe: PrismaClassroom | null;
    studentProgress: PrismaStudentProgress[];
};

export type ReactionWithUser = Reaction & {
    user: Pick<User, 'id' | 'name'>
};

export type MessageWithReactions = Message & {
    sender: Pick<User, 'id' | 'name' | 'image'>;
    reactions: ReactionWithUser[];
};

export type AppTask = Task;

export type AnnouncementWithAuthor = Announcement & {
    author: { name?: string | null };
};

export type StudentForCard = Pick<User, 'id' | 'name' | 'email' | 'points' | 'image' | 'role' | 'classeId'> & {
  etat: {
    isPunished: boolean;
  } | null;
};

export type ClassroomWithDetails = Omit<Classroom, 'professeurId'> & {
  eleves: (User & { etat: EtatEleve | null })[];
};

export type CareerWithTheme = Metier & {
  theme: {
    backgroundColor: string;
    textColor: string;
    primaryColor: string;
    accentColor: string;
    cursor: string;
    imageUrl?: string;
  };
};

export type CoursSessionWithRelations = CoursSession & {
    participants: User[];
    professeur: User;
    classe: Classroom;
};

export type TaskForProfessorValidation = StudentProgress & {
  task: Task;
  student: Pick<User, 'id' | 'name'>;
};

export type SimulatedStudent = Omit<StudentWithStateAndCareer, 'studentProgress' | 'sessionsParticipees'> & {
    studentProgress: StudentProgress[];
    sessionsParticipees: any[];
};
