// src/types/index.tsx
// Importer les types depuis notre source de vérité unique
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
  ProgressStatus as PrismaProgressStatus,
  Quiz as PrismaQuiz,
  QuizQuestion as PrismaQuizQuestion,
  QuizOption as PrismaQuizOption
} from '@prisma/client';

import type { Instance as PeerInstance, SignalData as PeerSignalData } from 'simple-peer';

// Re-export des types Prisma de base si nécessaire, mais il vaut mieux importer directement.
export * from '@prisma/client';

// Types pour le nouveau système de tableau blanc avec Redis
export type OperationType = 'DRAW' | 'CLEAR' | 'UNDO' | 'REDO';

export interface CanvasElement {
  id: string;
  type: 'path' | 'rectangle' | 'circle' | 'text' | 'image';
  points: number[][]; // Pour les 'path'
  x?: number; y?: number; width?: number; height?: number; // Pour les autres formes
  color: string;
  strokeWidth: number;
  opacity: number;
  createdAt: number;
  createdBy: string; // userId
}

// CORRECTION: Un seul type unifié pour toutes les opérations
export type WhiteboardOperation = {
  id: string; // uuidv4 pour chaque segment
  pathId: string; // uuidv4 pour le trait complet
  userId: string;
  sessionId: string;
  timestamp: number;
} & (
  | {
      type: 'DRAW';
      payload: {
        from: { x: number; y: number };
        to: { x: number; y: number };
        tool: 'pen' | 'eraser';
        color: string;
        brushSize: number;
      };
    }
  | {
      type: 'CLEAR';
      payload?: null; // Pas de payload pour clear
    }
);

export interface WhiteboardSceneObject {
  elements: CanvasElement[];
}

export type Html5CanvasScene = WhiteboardSceneObject | null;

// Enum pour les niveaux de compréhension
export enum ComprehensionLevel {
  UNDERSTOOD = 'understood',
  CONFUSED = 'confused',
  LOST = 'lost',
  NONE = 'none',
}

// Type défini manuellement car il n'est pas un modèle Prisma

// Dans src/types/index.ts - Ajouter au type DocumentInHistory
export interface DocumentInHistory {
  id: string;
  name: string;
  url: string;
  createdAt: string;
  sharedBy: string;
  coursSessionId: string;
  sharedByUserId?: string; // ✅ Optionnel pour éviter les breaking changes
}

// CORRECTION: Utiliser directement le type PrismaRole pour la cohérence
export type User = Omit<PrismaUser, 'role'> & {
  role: PrismaRole;
  ambition?: string | null;
  points?: number | null;
};

// Types composites et spécifiques à l'application
export type ClassroomWithDetails = PrismaClassroom & { 
  eleves: (User & { 
    etat: (PrismaEtatEleve & { metier: PrismaMetier | null }) | null 
  })[] 
};

export type SessionParticipant = Pick<User, 'id' | 'name' | 'role'>;

// Définition pour les détails d'une session, utilisée par la route API et la page
export interface SessionDetails {
  id: string;
  teacher: User;
  students: User[];
  participants: User[];
  documentHistory: DocumentInHistory[];
  classroom: ClassroomWithDetails | null;
  startTime: string;
  endTime: string | null;
  activeQuiz: QuizWithQuestions | null;
}

// Types pour Pusher
export interface PusherMember {
  id: string;
  info?: any;
}

export interface PusherSubscriptionSucceededEvent {
  members: Record<string, PusherMember>;
  count: number;
}

export interface PusherMemberEvent {
  id: string;
  info?: any;
}

// Types pour les signaux WebRTC
export interface SignalPayload {
  channelName: string;
  userId: string;
  target: string;
  signal: PeerSignalData;
  isReturnSignal: boolean;
}

export interface IncomingSignalData {
  userId: string;
  signal: PeerSignalData;
  target: string;
  isReturnSignal?: boolean;
}

export interface SessionClientProps {
  sessionId: string;
  initialStudents: User[];
  initialTeacher: User;
  currentUserRole: PrismaRole;
  currentUserId: string;
  classroom: ClassroomWithDetails | null;
  initialDocumentHistory: DocumentInHistory[];
  initialActiveQuiz?: QuizWithQuestions | null; // ✅ Utiliser le type hydraté
}

// ✅ NOUVEAUX TYPES POUR LES OBJETS HYDRATÉS (avec relations)
export type QuizOption = PrismaQuizOption;

export type QuizQuestionWithOptions = PrismaQuizQuestion & {
  options: QuizOption[];
};

export type QuizWithQuestions = PrismaQuiz & {
  questions: QuizQuestionWithOptions[];
};

export type Quiz = PrismaQuiz;
export type QuizQuestion = PrismaQuizQuestion;

export interface QuizResponse {
  userId: string;
  userName: string;
  answers: Record<string, string>; // Map<questionId, selectedOptionId>
  quizId: string;
}

export interface QuizResults {
  quizId: string;
  scores: Record<string, { score: number; total: number }>; // Map<userId, { score, total }>
  responses: Record<string, QuizResponse>;
}

export interface BreakoutRoom {
  id: string;
  name: string;
  task: string;
  participants: User[];
  documentId: string | null;
  documentName: string | null;
  documentUrl: string | null;
}

// CORRECTION: Types pour la compatibilité avec les composants
export type { PeerInstance, PeerSignalData };
