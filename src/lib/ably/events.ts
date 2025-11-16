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

    // Real-time interaction events
    HAND_RAISE_UPDATE: 'hand-raise-update',
    UNDERSTANDING_UPDATE: 'understanding-update',

    // Tool-related events
    ACTIVE_TOOL_CHANGED: 'active-tool-changed',
    SCREEN_SHARE_STARTED: 'screen-share-started',
    SCREEN_SHARE_ENDED: 'screen-share-ended',

    // Document events
    DOCUMENT_SHARED: 'document-shared',
    DOCUMENT_DELETED: 'document-deleted', // ✅ AJOUTÉ ICI

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
} as const;

export type AblyEventName = typeof AblyEvents[keyof typeof AblyEvents];