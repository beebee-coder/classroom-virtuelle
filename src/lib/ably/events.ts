// src/lib/ably/events.ts - VERSION CORRIGÉE SANS DOUBLONS

/**
 * @fileoverview Defines constants for Ably event names.
 * Centralizing event names helps prevent typos and makes them easy to manage.
 */

export const AblyEvents = {
    // Session lifecycle events
    SESSION_INVITATION: 'session-invitation',
    SESSION_ENDED: 'session-ended',
    PARTICIPANT_SPOTLIGHTED: 'participant-spotlighted',
    NEW_PENDING_STUDENT: 'new-pending-student',

    // ✅ Événement ajouté pour la validation élève
    STUDENT_VALIDATED: 'student-validated',

    // Real-time interaction events
    HAND_RAISE_UPDATE: 'hand-raise-update',
    HAND_ACKNOWLEDGED: 'hand-acknowledged',
    UNDERSTANDING_UPDATE: 'understanding-update',

    // Tool-related events
    ACTIVE_TOOL_CHANGED: 'active-tool-changed',
    SCREEN_SHARE_STARTED: 'screen-share-started',
    SCREEN_SHARE_ENDED: 'screen-share-ended',

    // Document events
    DOCUMENT_SHARED: 'document-shared',
    DOCUMENT_DELETED: 'document-deleted',

    // Whiteboard events
    WHITEBOARD_OPERATION_BATCH: 'whiteboard-operation-batch',
    WHITEBOARD_CONTROLLER_UPDATE: 'whiteboard-controller-update',
    WHITEBOARD_CLEARED: 'whiteboard-cleared',
    
    // Timer events
    TIMER_STARTED: 'timer-started',
    TIMER_PAUSED: 'timer-paused',
    TIMER_RESET: 'timer-reset',

    // WebRTC signaling
    SIGNAL: 'signal',

    // Chat events
    NEW_MESSAGE: 'new-message',
    REACTION_UPDATE: 'reaction-update',
    HISTORY_CLEARED: 'history-cleared',

    // Quiz events
    QUIZ_STARTED: 'quiz-started',
    QUIZ_RESPONSE: 'quiz-response',
    QUIZ_ENDED: 'quiz-ended',
    QUIZ_CLOSED: 'quiz-closed',

    // Breakout Rooms events
    BREAKOUT_ROOMS_STARTED: 'breakout-rooms-started',
    BREAKOUT_ROOMS_ENDED: 'breakout-rooms-ended',
} as const;

export type AblyEventName = typeof AblyEvents[keyof typeof AblyEvents];