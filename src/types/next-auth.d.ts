// src/types/next-auth.d.ts
import NextAuth, { DefaultSession, User as NextAuthUser } from "next-auth";
import { JWT as NextAuthJWT } from "next-auth/jwt";
import { Role, ValidationStatus } from '@prisma/client';

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: Role;
      classeId?: string | null;
      validationStatus?: ValidationStatus;
      isNewUser?: boolean; // Pour le flux d'onboarding
    } & DefaultSession["user"];
  }

  // Étendre le type User de base de next-auth
  interface User extends NextAuthUser {
    role?: Role;
    classeId?: string | null;
    validationStatus?: ValidationStatus;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends NextAuthJWT {
    id?: string;
    role?: Role;
    classeId?: string | null;
    validationStatus?: ValidationStatus;
    isNewUser?: boolean; // Pour le flux d'onboarding
  }
}
