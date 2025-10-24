import { ComprehensionLevel } from "@/components/StudentSessionControls";
import { User, Role, ClassroomWithDetails } from "@/lib/types";

// Types pour Pusher
 export interface PusherMember {
    id: string;
    info?: any;
  }
  
  export  interface PusherMembers {
    members: Record<string, PusherMember>;
    count: number;
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
  
  export  interface DocumentEvent {
    url: string;
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
    initialStudents: User[];
    initialTeacher: User;
    currentUserRole: Role;
    currentUserId: string;
    classroom: ClassroomWithDetails | null;
  }