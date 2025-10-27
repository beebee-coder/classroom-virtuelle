// src/lib/prisma.ts
import { PrismaClient, Prisma } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// L'URL de la base de données est lue depuis .env via schema.prisma, pas besoin de la spécifier ici.
const prismaClientOptions: Prisma.PrismaClientOptions = {
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] as Prisma.LogLevel[]
    : ['error'] as Prisma.LogLevel[],
};

const prisma = global.prisma || new PrismaClient(prismaClientOptions);

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
