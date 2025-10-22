// src/lib/session.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth-options";
import type { Session } from 'next-auth';
import { cookies } from 'next/headers';

// ---=== BYPASS BACKEND ===---
const DUMMY_SESSIONS: Record<string, Session> = {
  teacher: {
    user: {
      id: 'teacher-id',
      name: 'Professeur Test (Démo)',
      email: 'teacher@example.com',
      role: 'PROFESSEUR',
      image: null,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  },
  student: {
    user: {
      id: 'student1', // Using a specific student for consistency
      name: 'Ahmed (Démo)',
      email: 'ahmed0@example.com',
      role: 'ELEVE',
      classeId: 'classe-a',
      image: null,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  },
};
// ---=========================---


export const getAuthSession = async (): Promise<Session | null> => {
  // ---=== BYPASS BACKEND ===---
  // This mode is for demonstration purposes without a full backend authentication flow.
  // It relies on a cookie to simulate the logged-in user role.
  try {
    const cookieStore = cookies();
    const dummyRoleCookie = cookieStore.get('dummyRole');
    const currentDummyRole = dummyRoleCookie?.value;

    if (currentDummyRole === 'teacher' || currentDummyRole === 'student') {
      console.log(`👤 [BYPASS] Session factice active via cookie pour: ${currentDummyRole}`);
      return DUMMY_SESSIONS[currentDummyRole];
    }
  } catch (error) {
     // This can happen during build time or in environments where `cookies()` is not available.
     // We can safely ignore it and proceed to the real authentication method.
     console.log('🍪 [BYPASS] `cookies()` indisponible, utilisation de la méthode d\'authentification par défaut.');
  }

  // If no bypass cookie is found, attempt to get the real session.
  // In a pure bypass environment, this might always return null.
  return getServerSession(authOptions);
  // ---=========================---
};
