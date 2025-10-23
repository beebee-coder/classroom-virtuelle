// src/lib/actions/user.actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { getAuthSession } from "@/lib/session";

// ---=== BYPASS BACKEND ===---
export async function updateUserProfileImage(imageUrl: string) {
  const session = await getAuthSession();
  const userId = session?.user?.id;

  if (!userId) {
    console.warn("👤 [BYPASS] Tentative de mise à jour d'image sans session. Action ignorée.");
    throw new Error("Unauthorized (Bypassed)");
  }

  console.log(`🖼️ [BYPASS] Mise à jour de l'image de profil pour l'utilisateur ${userId} avec l'URL: ${imageUrl} (factice)`);

  try {
    // En mode bypass, nous ne mettons pas à jour la base de données.
    console.log("   -> L'appel à la base de données a été sauté.");

    // Revalidate paths where the user's avatar might be displayed
    revalidatePath('/', 'layout');
    
  } catch (error) {
    console.error("❌ Erreur (simulée) lors de la mise à jour de l'image de profil:", error);
    throw new Error("Failed to update profile image (Bypassed).");
  }
}
// ---=========================---
