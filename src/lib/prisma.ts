// src/lib/prisma.ts
import { PrismaClient, Role, ValidationStatus } from '@prisma/client';
import { broadcastNewPendingStudent } from './actions/ably-session.actions';

// Déclare un client Prisma global pour éviter de créer de nouvelles instances à chaque rechargement à chaud.
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prismaClientSingleton = () => {
  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

  // Middleware pour intercepter la création d'utilisateurs
  prisma.$use(async (params, next) => {
    // Exécuter l'opération de base de données d'abord
    const result = await next(params);

    // Après l'opération, si on vient de créer un utilisateur...
    if (params.model === 'User' && params.action === 'create') {
      const newUser = result;
      
      // ... et que cet utilisateur est un élève en attente de validation...
      if (newUser.role === Role.ELEVE && newUser.validationStatus === ValidationStatus.PENDING) {
        console.log('✅ [PRISMA MIDDLEWARE] - Nouvel élève détecté, déclenchement de la notification Ably.');
        
        // ... alors on déclenche la notification.
        // Utilisation d'un `await` non bloquant pour ne pas retarder la réponse HTTP.
        broadcastNewPendingStudent({
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
        }).catch(err => {
          // Log l'erreur mais ne bloque pas l'opération principale
          console.error('❌ [PRISMA MIDDLEWARE] - Échec de la diffusion Ably en arrière-plan:', err);
        });
      }
    }

    return result;
  });

  return prisma;
};


const prisma = global.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
