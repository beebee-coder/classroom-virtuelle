// src/lib/ably/channels.ts

/**
 * @fileoverview Channel Name Factory for Ably.
 * 
 * This file centralizes the logic for generating Ably channel names across the application.
 * It follows Ably's recommended naming convention: [product:feature:id]
 * 
 * - getSessionChannelName: Generates the channel name for a real-time session.
 * - getClassChannelName: Generates the channel name for a classroom.
 * - getUserChannelName: Generates the channel name for a specific user.
 */

const PRODUCT_PREFIX = 'classroom-connector';

/**
 * Generates the channel name for a live session.
 * This is a presence channel, so we prefix it accordingly.
 * @param sessionId The unique ID of the session.
 * @returns The Ably channel name string.
 */
export function getSessionChannelName(sessionId: string): string {
    if (!sessionId) throw new Error('sessionId cannot be empty');
    return `${PRODUCT_PREFIX}:session:${sessionId}`;
}

/**
 * Generates the channel name for a classroom.
 * This is a presence channel.
 * @param classroomId The unique ID of the classroom.
 * @returns The Ably channel name string.
 */
export function getClassChannelName(classroomId: string): string {
    if (!classroomId) throw new Error('classroomId cannot be empty');
    return `${PRODUCT_PREFIX}:class:${classroomId}`;
}

/**
 * Generates the channel name for a specific user.
 * This is a private channel for targeted messages like invitations.
 * @param userId The unique ID of the user.
 * @returns The Ably channel name string.
 */
export function getUserChannelName(userId: string): string {
    if (!userId) throw new Error('userId cannot be empty');
    return `${PRODUCT_PREFIX}:user:${userId}`;
}
