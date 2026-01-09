// src/lib/actions/activity.actions.ts
'use server';

import { getAuthSession } from '@/lib/auth';
import prisma from '../prisma';
import { Role } from '@prisma/client';

const ACTIVITY_POINTS = 1; // Points attribués pour chaque période d'activité

/**
 * Tracks student activity during a session and awards points.
 * This is meant to be called periodically by the client (like a heartbeat).
 * @param activityDurationInSeconds The duration of activity this ping represents.
 * @returns An object indicating success and points awarded.
 */
export async function trackStudentActivity(activityDurationInSeconds: number): Promise<{ success: boolean; pointsAwarded: number }> {
    const session = await getAuthSession();

    if (!session?.user?.id || session.user.role !== Role.ELEVE) {
        // Silently fail if not an authenticated student
        return { success: false, pointsAwarded: 0 };
    }

    const studentId = session.user.id;

    try {
        // In a real application, you might add more complex logic here,
        // such as checking if the student is in an active session
        // or preventing point abuse. For now, we'll keep it simple.

        const updatedUser = await prisma.user.update({
            where: { id: studentId },
            data: {
                points: {
                    increment: ACTIVITY_POINTS
                }
            },
            select: {
                points: true
            }
        });

        console.log(`✨ [ACTIVITY] +${ACTIVITY_POINTS} points for student ${studentId}. New total: ${updatedUser.points}`);

        return { success: true, pointsAwarded: ACTIVITY_POINTS };

    } catch (error) {
        console.error(`❌ [ACTIVITY] Error tracking activity for student ${studentId}:`, error);
        return { success: false, pointsAwarded: 0 };
    }
}
