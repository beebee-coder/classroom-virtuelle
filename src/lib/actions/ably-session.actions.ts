// src/lib/actions/ably-session.actions.ts
'use server';

// This file is being deprecated. The logic has been moved to client components
// that now use `httpAblyTrigger` to communicate with a dedicated API route.
// Keeping the file to prevent breaking imports, but the functions are now no-ops.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { Role } from '@prisma/client';
import { ComprehensionLevel } from '@/types';
import prisma from '../prisma';

console.warn("⚠️ [DEPRECATION] - `ably-session.actions.ts` is obsolete. Logic has been moved to client-side calls.");

export async function updateStudentSessionStatus(sessionId: string, status: { isHandRaised?: boolean; understanding?: ComprehensionLevel }) {
    // Cette logique est maintenant gérée côté client dans SessionClient.tsx
    // en utilisant le nouveau httpAblyTrigger.
    console.log("Called deprecated function: updateStudentSessionStatus");
    return { success: true, message: "This action is deprecated." };
}


export async function broadcastActiveTool(sessionId: string, tool: string) {
    // Cette logique est maintenant gérée côté client dans SessionClient.tsx
    // en utilisant le nouveau httpAblyTrigger.
    console.log("Called deprecated function: broadcastActiveTool");
    return { success: true, message: "This action is deprecated." };
}

export async function broadcastTimerEvent(sessionId: string, event: 'timer-started' | 'timer-paused' | 'timer-reset', data?: any) {
    // Cette logique est maintenant gérée côté client dans SessionClient.tsx
    // en utilisant le nouveau httpAblyTrigger.
    console.log("Called deprecated function: broadcastTimerEvent");
    return { success: true, message: "This action is deprecated." };
}