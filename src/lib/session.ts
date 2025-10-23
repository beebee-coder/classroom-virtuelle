// src/lib/session.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth-options";
import type { Session } from 'next-auth';

// La logique de session factice a été retirée pour passer en mode réel.
// L'application s'appuie maintenant exclusivement sur NextAuth.

export const getAuthSession = async (): Promise<Session | null> => {
  // En mode réel, nous utilisons directement getServerSession de NextAuth.
  // Cela garantit que l'authentification est sécurisée et basée sur la session réelle de l'utilisateur.
  return getServerSession(authOptions);
};
