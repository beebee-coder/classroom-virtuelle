// src/types/index.ts
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
    ProgressStatus as PrismaProgressStatus
} from '@prisma/client';

import type { Instance as PeerInstance, SignalData as PeerSignalData } from 'simple-peer';
import { TLStoreSnapshot } from "@tldraw/tldraw";

// Re-export des types Prisma de base si nécessaire ailleurs, mais il vaut mieux importer directement.
export * from '@prisma/client';

// Enum pour les niveaux de compréhension
export enum ComprehensionLevel {
  UNDERSTOOD = 'understood',
  CONFUSED = 'confused',
  LOST = 'lost',
  NONE = 'none',
}

// Type défini manuellement car il n'est pas un modèle Prisma
export type DocumentInHistory = {
  id: string;
  name: string;
  url: string;
  createdAt: Date;
  coursSessionId: string;
};


// Types composites et spécifiques à l'application
export type ClassroomWithDetails = PrismaClassroom & { eleves: (PrismaUser & { etat: (PrismaEtatEleve & { metier: PrismaMetier | null}) | null })[] };

export type SessionParticipant = Pick<PrismaUser, 'id' | 'name' | 'role'>;

// Définition pour les détails d'une session, utilisée par la route API et la page
export interface SessionDetails {
    id: string;
    teacher: PrismaUser;
    students: PrismaUser[];
    classroom: { id: string; nom: string } | null;
    documentHistory: DocumentInHistory[];
    startTime: string;
    endTime: string | null;
}


// Types pour Pusher
 export interface PusherMember {
    id: string;
    info?: any;
  }
  
  export  interface PusherSubscriptionSucceededEvent {
    members: Record<string, PusherMember>;
    count: number;
  }
  
  export  interface PusherMemberEvent {
    id: string;
    info?: any;
  }
  
  // Types pour les signaux WebRTC
  export  interface SignalPayload {
    channelName: string;
    userId: string;
    target: string;
    signal: PeerSignalData;
    isReturnSignal: boolean;
  }
  
  export  interface IncomingSignalData {
    userId: string;
    signal: PeerSignalData;
    target: string;
    isReturnSignal?: boolean;
  }
  
  export  interface SessionClientProps {
    sessionId: string;
    initialStudents: PrismaUser[];
    initialTeacher: PrismaUser;
    currentUserRole: PrismaRole;
    currentUserId: string;
    classroom: ClassroomWithDetails | null;
    initialDocumentHistory: DocumentInHistory[];
  }
