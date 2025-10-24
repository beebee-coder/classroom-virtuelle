// src/lib/types.ts - Version sans Prisma

// Définir manuellement les enums car Prisma est supprimé
export enum Role {
    ELEVE = 'ELEVE',
    PROFESSEUR = 'PROFESSEUR'
}

export enum TaskType {
    DAILY = 'DAILY',
    WEEKLY = 'WEEKLY',
    MONTHLY = 'MONTHLY'
}

export enum TaskCategory {
    MATH = 'MATH',
    LANGUAGE = 'LANGUAGE',
    SCIENCE = 'SCIENCE',
    HISTORY = 'HISTORY',
    ART = 'ART',
    SPORT = 'SPORT',
    HOME = 'HOME',
    SOCIAL = 'SOCIAL'
}

export enum TaskDifficulty {
    EASY = 'EASY',
    MEDIUM = 'MEDIUM',
    HARD = 'HARD'
}

export enum ValidationType {
    AUTOMATIC = 'AUTOMATIC',
    PARENT = 'PARENT',
    PROFESSOR = 'PROFESSOR'
}

export enum ProgressStatus {
    PENDING_ASSIGNMENT = 'PENDING_ASSIGNMENT',
    IN_PROGRESS = 'IN_PROGRESS',
    PENDING_VALIDATION = 'PENDING_VALIDATION',
    VERIFIED = 'VERIFIED',
    REJECTED = 'REJECTED'
}

// Recréer les types de base qui étaient générés par Prisma
// Ce sont des interfaces simples pour correspondre aux données factices.
export interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: Role;
  classeId?: string | null;
  points?: number;
  ambition?: string | null;
  emailVerified?: Date | null;
  parentPassword?: string | null;
}

export interface Classroom {
  id: string;
  nom: string;
  professeurId: string;
}

export interface Metier {
  id: string;
  nom: string;
  description: string;
  icon: string;
  theme: any; // Utiliser `any` pour la flexibilité avec les données factices JSON.
}

export interface CoursSession {
  id: string;
  professeurId: string;
  classroomId: string;
  startTime: Date;
  endTime?: Date | null;
}

export interface Leaderboard {
  id: string;
  studentId: string;
  dailyPoints: number;
  weeklyPoints: number;
  monthlyPoints: number;
  totalPoints: number;
  completedTasks: number;
  currentStreak: number;
  bestStreak: number;
  rank: number;
  updatedAt: Date;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  points: number;
  type: TaskType;
  category: TaskCategory;
  difficulty: TaskDifficulty;
  validationType: ValidationType;
  requiresProof: boolean;
  attachmentUrl?: string | null;
  isActive: boolean;
  startTime?: Date | null;
  duration?: number | null; // en minutes
}

export interface StudentProgress {
  id: string;
  studentId: string;
  taskId: string;
  status: ProgressStatus;
  completionDate?: Date | null;
  submissionUrl?: string | null;
  pointsAwarded?: number | null;
  accuracy?: number | null;
  recipeName?: string | null;
}

export interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  messageId: string;
}

export interface Message {
  id: string;
  message: string;
  senderId: string;
  classroomId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  isQuestion: boolean;
  conversationId?: string | null;
  directMessageSenderId?: string | null;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  classeId?: string | null;
  createdAt: Date;
  attachmentUrl?: string | null;
}

export interface Conversation {
  id: string;
  initiatorId: string;
  receiverId: string;
  createdAt: Date;
  updatedAt: Date;
}


// Types complexes qui étaient basés sur les relations Prisma

export type SessionParticipant = Pick<User, 'id' | 'name' | 'role'>;

export type StudentWithStateAndCareer = User & {
    etat?: {
        metier?: Metier | null;
    } | null;
    classe?: Classroom | null;
    progress?: StudentProgress[];
    sessionsParticipees?: any[];
};

export type ReactionWithUser = Reaction & {
    user: Pick<User, 'id' | 'name'>
};

export type MessageWithReactions = Message & {
    sender: Pick<User, 'id' | 'name' | 'image'>;
    reactions: ReactionWithUser[];
    senderName?: string; // Pour compatibilité avec les données factices
};

export type AppTask = Task;

export type FullConversation = Conversation & {
    messages: MessageWithReactions[];
    initiator: Pick<User, 'id' | 'name' | 'image'>;
    receiver: Pick<User, 'id' | 'name' | 'image'>;
};

export type AnnouncementWithAuthor = Announcement & {
    author: { name?: string | null };
};

export type StudentForCard = Pick<User, 'id' | 'name' | 'email' | 'points' | 'image' | 'role' | 'classeId'> & {
  etat: {
    isPunished: boolean;
  } | null;
};

export type ClassroomWithDetails = Omit<Classroom, 'professeurId'> & {
  eleves: StudentForCard[];
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

export interface StudentState {
    id: string;
    eleveId: string;
    isPunished: boolean;
    metierId: string | null;
    metier: Metier | null;
}

export interface StudentClass {
    id: string;
    nom: string;
    professeurId: string;
}

export type SimulatedStudent = Omit<StudentWithStateAndCareer, 'progress' | 'sessionsParticipees'> & {
    progress: StudentProgress[];
    sessionsParticipees: any[];
};
