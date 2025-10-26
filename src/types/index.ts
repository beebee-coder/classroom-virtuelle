// src/types/index.ts
// Importer les types depuis notre source de vérité unique
import type { User, Role, Classroom, EtatEleve, Document as PrismaDocument } from '@/lib/types';
import type { Instance as PeerInstance, SignalData as PeerSignalData } from 'simple-peer';
import { TLEditorSnapshot } from "@tldraw/tldraw";
import { ComprehensionLevel } from '@/lib/types';

// Re-export des types Prisma de base si nécessaire ailleurs, mais il vaut mieux importer directement.
export * from '@prisma/client';

// Types composites et spécifiques à l'application
export type ClassroomWithDetails = import('@prisma/client').Classroom & { eleves: (import('@prisma/client').User & { etat: import('@prisma/client').EtatEleve | null })[] };

export type DocumentInHistory = {
  id: string;
  name: string;
  url: string;
  createdAt: Date;
  coursSessionId: string;
};

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
  
  // Types pour les événements de session
  export  interface SpotlightEvent {
    participantId: string;
  }
  
  export  interface HandRaiseEvent {
    userId: string;
    isRaised: boolean;
  }
  
  export  interface UnderstandingEvent {
    userId: string;
    status: ComprehensionLevel;
  }
  
  export  interface TimerEvent {
    duration?: number;
    timeLeft?: number;
    isRunning?: boolean;
  }
  
  export  interface ToolEvent {
    tool: string;
  }
  
  export interface DocumentEvent {
    url: string;
    newHistory: DocumentInHistory[];
  }
  
  // Définition de types locaux
  export  interface PeerData {
    id: string;
    peer: PeerInstance;
  }
  
  export  interface RemoteParticipant {
    id: string;
    stream: MediaStream | undefined;
  }
  
  export type ActiveTool = 'whiteboard' | 'document' | 'quiz' | 'camera';
  
  export  interface SessionClientProps {
    sessionId: string;
    initialStudents: import('@prisma/client').User[];
    initialTeacher: import('@prisma/client').User;
    currentUserRole: import('@prisma/client').Role;
    currentUserId: string;
    classroom: ClassroomWithDetails | null;
    initialDocumentHistory: DocumentInHistory[];
  }

  export interface WhiteboardUpdateEvent {
    senderId: string;
    snapshot: TLEditorSnapshot;
  }

  export interface WhiteboardControllerEvent {
    controllerId: string;
  }
  
export type SessionParticipant = Pick<import('@prisma/client').User, 'id' | 'name' | 'role'>;
