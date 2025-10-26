// src/lib/prisma.ts
import { PrismaClient, Prisma } from '@prisma/client';

// Debug: Vérifier que la variable d'environnement est chargée
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✓ Définie' : '✗ Non définie');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL non définie dans les variables d\'environnement');
  console.error('Vérifiez votre fichier .env.local');
}

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Correction du typage pour les options Prisma
const prismaClientOptions: Prisma.PrismaClientOptions = {
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] as Prisma.LogLevel[]
    : ['error'] as Prisma.LogLevel[],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
};

const prisma = global.prisma || new PrismaClient(prismaClientOptions);

// Gestion améliorée des erreurs de connexion
prisma.$connect()
  .then(() => {
    console.log('✅ Connexion à la base de données établie avec succès');
  })
  .catch((error) => {
    console.error('❌ Erreur de connexion à la base de données:', error.message);
    console.error('URL de connexion:', process.env.DATABASE_URL?.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;