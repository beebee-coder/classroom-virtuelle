// src/lib/actions/user.actions.ts
'use server';

import prisma from '@/lib/prisma';
import { getAuthSession } from '@/lib/session';
import { revalidatePath } from 'next/cache';

export async function updateUserProfileImage(imageUrl: string) {
  console.log(`⚡️ [ACTION] updateUserProfileImage déclenchée avec l'URL: ${imageUrl}`);
  const session = await getAuthSession();
  if (!session?.user) {
    console.error('❌ [ACTION] Non autorisé : aucune session utilisateur trouvée.');
    throw new Error('Unauthorized');
  }
  console.log(`👤 [ACTION] Utilisateur authentifié : ${session.user.id}`);

  try {
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { image: imageUrl },
    });
    console.log('✅ [DB] Base de données mise à jour avec succès :', updatedUser);

    revalidatePath('/teacher/profile');
    revalidatePath(`/student/${session.user.id}`);
    console.log('🔄 [REVALIDATE] Revalidation des chemins déclenchée.');

    return updatedUser;
  } catch (error) {
    console.error('❌ [DB] Erreur lors de la mise à jour de l\'utilisateur dans Prisma :', error);
    throw error;
  }
}
