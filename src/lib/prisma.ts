// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

// Déclare un client Prisma global pour éviter de créer de nouvelles instances à chaque rechargement à chaud.
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
