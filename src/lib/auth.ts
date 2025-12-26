// src/lib/auth.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

/**
 * Utilitaire sécurisé pour récupérer la session côté serveur.
 * Cet wrapper est un 'server-only' component.
 */
export async function getAuthSession() {
  return await getServerSession(authOptions);
}
