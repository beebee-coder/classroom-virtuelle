// src/lib/session.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth-options";
import type { Session } from 'next-auth';

// ---=== BYPASS BACKEND ===---
const DUMMY_SESSIONS = {
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
      id: 'student1',
      name: 'Alice (Démo)',
      email: 'student1@example.com',
      role: 'ELEVE',
      classeId: 'classe-a',
      image: null,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  },
};

// Variable pour choisir la session à simuler (peut être changée pour les tests)
let currentDummyRole: 'teacher' | 'student' | null = null; 

// Vous pouvez appeler ces fonctions dans la console de votre navigateur pour changer de rôle
if (typeof window !== 'undefined') {
  (window as any).loginAsTeacher = () => {
    console.log("👤 [BYPASS] Changement vers le rôle PROFESSEUR");
    currentDummyRole = 'teacher';
    window.location.reload();
  };
  (window as any).loginAsStudent = () => {
    console.log("👤 [BYPASS] Changement vers le rôle ELEVE");
    currentDummyRole = 'student';
    window.location.reload();
  };
   (window as any).logout = () => {
    console.log("👤 [BYPASS] Déconnexion");
    currentDummyRole = null;
    window.location.href = '/';
  };
}
// ---=========================---


export const getAuthSession = async (): Promise<Session | null> => {
  // ---=== BYPASS BACKEND ===---
  // En environnement de développement, on peut forcer un rôle pour les tests
  const forcedRole = process.env.NEXT_PUBLIC_FORCE_ROLE;
  
  if (forcedRole === 'teacher' || forcedRole === 'student') {
    console.log(`👤 [BYPASS] Session forcée via .env: ${forcedRole}`);
    return DUMMY_SESSIONS[forcedRole];
  }

  if (currentDummyRole) {
    console.log(`👤 [BYPASS] Retourne une session factice pour: ${currentDummyRole}`);
    return DUMMY_SESSIONS[currentDummyRole];
  }
  
  // console.log("🔑 [AUTH] Appel original de getServerSession. Pas de bypass actif.");
  // return getServerSession(authOptions);
  
  console.log("👤 [BYPASS] Pas de session factice active, retourne null.");
  return null;
  // ---=========================---
};

