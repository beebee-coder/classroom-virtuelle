// src/lib/services/session-manager.ts
import { ablyTrigger } from '@/lib/ably/triggers';
import { AblyEvents } from '@/lib/ably/events';
import { getSessionChannelName, getUserChannelName } from '../ably/channels';
import prisma from '../prisma';

// --- Types et Interfaces ---

interface ActiveSession {
    id: string;
    teacherId: string;
    classroomId: string;
    studentIds: string[];
    startTime: Date;
    status: 'active' | 'ended';
    teacherName?: string;
    classroomName?: string;
}

interface SessionInvitation {
  sessionId: string;
  teacherId: string;
  classroomId: string;
  classroomName: string;
  teacherName: string;
  timestamp: string;
  type: 'session-invitation';
}

declare global {
  // eslint-disable-next-line no-var
  var activeSessions: Map<string, ActiveSession>;
}

if (!global.activeSessions) {
  global.activeSessions = new Map<string, ActiveSession>();
}

/**
 * Gère l'état des sessions actives en mémoire et les événements temps réel.
 */
export class SessionManager {

  /**
   * Crée et enregistre une nouvelle session active.
   */
  static async create(sessionId: string, teacherId: string, classroomId: string, studentIds: string[]): Promise<ActiveSession> {
    const [teacher, classroom] = await Promise.all([
      prisma.user.findUnique({ where: { id: teacherId } }),
      prisma.classroom.findUnique({ where: { id: classroomId } }),
    ]);

    const sessionData: ActiveSession = {
      id: sessionId,
      teacherId,
      classroomId,
      studentIds,
      startTime: new Date(),
      status: 'active',
      teacherName: teacher?.name || 'Professeur',
      classroomName: classroom?.nom || 'Classe',
    };

    global.activeSessions.set(sessionId, sessionData);
    console.log(`✅ [SESSION MANAGER] Session active créée et stockée: ${sessionId}`);
    
    return sessionData;
  }
  
  /**
   * Notifie qu'un élève a rejoint la session.
   */
  static async studentJoined(sessionId: string, studentId: string): Promise<void> {
    console.log(`✅ [SESSION MANAGER] L'élève ${studentId} a rejoint la session ${sessionId}`);
    // Cette méthode peut être étendue pour notifier le professeur, par exemple.
  }
  
    // Méthode pour obtenir les informations de session formatées
    static getSessionInvitationData(sessionId: string): SessionInvitation | null {
        const session = globalThis.activeSessions.get(sessionId);
        if (!session) return null;

        return {
            sessionId: session.id,
            teacherId: session.teacherId,
            classroomId: session.classroomId,
            classroomName: session.classroomName || 'Classe',
            teacherName: session.teacherName || 'Professeur',
            timestamp: session.startTime.toISOString(),
            type: 'session-invitation'
        };
    }

    // Méthode pour vérifier si une session est active
    static isSessionActive(sessionId: string): boolean {
        const session = globalThis.activeSessions.get(sessionId);
        return !!(session && session.status === 'active');
    }
}
