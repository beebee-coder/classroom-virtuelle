// src/lib/actions/user.actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { User } from '@prisma/client';

export async function getUserSettings(userId: string): Promise<User | null> {
    if (!userId) return null;
    return await prisma.user.findUnique({
        where: { id: userId },
    });
}

export async function updateUserProfileImage(imageUrl: string) {
  const session = await getAuthSession();
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Non autorisé");
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { image: imageUrl },
    });
    revalidatePath('/', 'layout');
  } catch (error) {
    throw new Error("Impossible de mettre à jour l'image de profil.");
  }
}

export async function updateUserSettings(settings: { name?: string; parentPassword?: string }) {
    const session = await getAuthSession();
    const userId = session?.user?.id;
  
    if (!userId) {
      throw new Error("Non autorisé");
    }

    const dataToUpdate: { name?: string; parentPassword?: string | null } = {};

    if (settings.name) {
        if (settings.name.length < 2) throw new Error("Le nom est trop court.");
        dataToUpdate.name = settings.name;
    }

    if (settings.parentPassword !== undefined && session.user.role === 'ELEVE') {
        if (settings.parentPassword && settings.parentPassword.length < 4) {
            throw new Error("Le mot de passe parental est trop court.");
        }
        dataToUpdate.parentPassword = settings.parentPassword || null;
    }

    if (Object.keys(dataToUpdate).length === 0) {
        return;
    }
  
    try {
      await prisma.user.update({
        where: { id: userId },
        data: dataToUpdate,
      });
  
      revalidatePath('/', 'layout');
      
    } catch (error) {
      throw new Error("Impossible de sauvegarder les paramètres.");
    }
}
