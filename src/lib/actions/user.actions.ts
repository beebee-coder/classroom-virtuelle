// src/lib/actions/user.actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function updateUserProfileImage(imageUrl: string) {
  console.log(`🖼️ [ACTION] updateUserProfileImage`);
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    console.error("❌ Erreur: Tentative de mise à jour d'image sans session.");
    throw new Error("Non autorisé");
  }

  console.log(`  -> pour l'utilisateur ${userId}.`);

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { image: imageUrl },
    });

    console.log("   -> Image de profil mise à jour en base de données.");

    // Revalide toutes les pages qui pourraient afficher l'avatar de l'utilisateur.
    // 'layout' est une option puissante pour revalider tout le site.
    revalidatePath('/', 'layout');
    
    console.log(`✅ [ACTION] Mise à jour de l'image de profil réussie pour ${userId}.`);
  } catch (error) {
    console.error("❌ Erreur lors de la mise à jour de l'image de profil:", error);
    throw new Error("Impossible de mettre à jour l'image de profil.");
  }
}
