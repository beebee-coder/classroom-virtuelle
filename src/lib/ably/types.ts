// src/lib/ably/types.ts - VERSION CORRIGÉE

/**
 * @fileoverview Shared TypeScript types for Ably integration.
 */
import Ably from 'ably';
import type { Role } from '@prisma/client';
import type { ComprehensionLevel, DocumentInHistory, WhiteboardOperation } from '@/types';

/**
 * The data payload associated with a user's presence on a channel.
 * This is the information that other members of the channel receive.
 */
export interface AblyPresenceMember {
    id: string;
    name: string;
    role: Role;
    image?: string | null;
    // CORRECTION: Ajout de la propriété data pour les métadonnées supplémentaires
    data?: {
        userId?: string;
        email?: string;
        [key: string]: any; // Pour les propriétés supplémentaires
    };
}

/**
 * Defines the structure for a real-time event published on Ably.
 * @template T - The type of the event data payload.
 */
export interface AblyEvent<T> {
    name: string;
    data: T;
}

/**
 * Defines the structure for a user's connection state change.
 */
export interface ConnectionStateChange {
    current: Ably.Types.ConnectionState;
    previous: Ably.Types.ConnectionState;
    reason?: Ably.Types.ErrorInfo | undefined;
}

// --- Event-specific Payloads ---

export type SessionEndedPayload = {
    sessionId: string;
    endedAt: string;
};

export type ParticipantSpotlightedPayload = {
    participantId: string;
};

export type HandRaiseUpdatePayload = {
    userId: string;
    isRaised: boolean;
};

export type UnderstandingUpdatePayload = {
    userId: string;
    status: ComprehensionLevel;
};

export type ActiveToolChangedPayload = {
    tool: string;
};

export type WhiteboardOperationBatchPayload = {
    operations: WhiteboardOperation[];
};

export type WhiteboardControllerUpdatePayload = {
    controllerId: string | null;
};

export type SessionInvitationPayload = {
    sessionId: string;
    teacherId: string;
    classroomId: string;
    classroomName: string;
    teacherName: string;
    timestamp: string;
};

export type DocumentSharedPayload = DocumentInHistory;