// src/lib/actions/user.actions.ts
"use server";

import prisma from "@/lib/prisma";
import { getAuthSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function updateUserProfileImage(imageUrl: string) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: imageUrl },
    });

    // Revalidate paths where the user's avatar might be displayed
    revalidatePath('/', 'layout');
    
  } catch (error) {
    console.error("Error updating user profile image:", error);
    throw new Error("Failed to update profile image.");
  }
}
