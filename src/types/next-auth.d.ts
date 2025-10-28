// src/types/next-auth.d.ts
import NextAuth, { DefaultSession } from "next-auth"
import { JWT as NextAuthJWT } from "next-auth/jwt"
import { Role } from '@prisma/client'

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: Role  // CORRECTION: Utiliser le type Role de Prisma au lieu de string
      classeId?: string | null;
    } & DefaultSession["user"]
  }

  interface User {
    role: Role;  // CORRECTION: Utiliser le type Role de Prisma
    classeId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends NextAuthJWT {
    id: string
    role: Role  // CORRECTION: Utiliser le type Role de Prisma
    classeId?: string | null;
  }
}