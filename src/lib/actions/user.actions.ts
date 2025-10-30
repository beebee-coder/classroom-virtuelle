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

    revalidatePath('/', 'layout');
    
    console.log(`✅ [ACTION] Mise à jour de l'image de profil réussie pour ${userId}.`);
  } catch (error) {
    console.error("❌ Erreur lors de la mise à jour de l'image de profil:", error);
    throw new Error("Impossible de mettre à jour l'image de profil.");
  }
}

export async function updateUserSettings(settings: { name?: string; parentPassword?: string }) {
    console.log(`⚙️ [ACTION] updateUserSettings`);
    const session = await auth();
    const userId = session?.user?.id;
  
    if (!userId) {
      console.error("❌ Erreur: Tentative de mise à jour des paramètres sans session.");
      throw new Error("Non autorisé");
    }

    const dataToUpdate: { name?: string; parentPassword?: string | null } = {};

    if (settings.name) {
        if (settings.name.length < 2) throw new Error("Le nom est trop court.");
        dataToUpdate.name = settings.name;
        console.log(`  -> Mise à jour du nom pour ${userId}.`);
    }

    if (settings.parentPassword !== undefined && session.user.role === 'ELEVE') {
        if (settings.parentPassword && settings.parentPassword.length < 4) {
            throw new Error("Le mot de passe parental est trop court.");
        }
        // CORRECTION : Assigner `null` si la chaîne est vide, sinon la chaîne elle-même.
        dataToUpdate.parentPassword = settings.parentPassword || null;
        console.log(`  -> Mise à jour du mot de passe parental pour l'élève ${userId}.`);
    }

    if (Object.keys(dataToUpdate).length === 0) {
        console.log("  -> Aucune donnée à mettre à jour.");
        return;
    }
  
    try {
      await prisma.user.update({
        where: { id: userId },
        data: dataToUpdate,
      });
  
      console.log(`✅ [ACTION] Paramètres mis à jour pour ${userId}.`);
      revalidatePath('/', 'layout');
      
    } catch (error) {
      console.error(`❌ Erreur lors de la mise à jour des paramètres pour ${userId}:`, error);
      throw new Error("Impossible de sauvegarder les paramètres.");
    }
}
