// src/lib/actions/user.actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { getAuthSession } from "@/lib/session";
import prisma from "@/lib/prisma";

export async function updateUserProfileImage(imageUrl: string) {
  const session = await getAuthSession();
  const userId = session?.user?.id;

  if (!userId) {
    console.error("❌ Erreur: Tentative de mise à jour d'image sans session.");
    throw new Error("Non autorisé");
  }

  console.log(`🖼️ [ACTION] Mise à jour de l'image de profil pour l'utilisateur ${userId}.`);

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { image: imageUrl },
    });

    console.log("   -> Image de profil mise à jour en base de données.");

    // Revalide toutes les pages qui pourraient afficher l'avatar de l'utilisateur.
    // 'layout' est une option puissante pour revalider tout le site.
    revalidatePath('/', 'layout');
    
  } catch (error) {
    console.error("❌ Erreur lors de la mise à jour de l'image de profil:", error);
    throw new Error("Impossible de mettre à jour l'image de profil.");
  }
}
