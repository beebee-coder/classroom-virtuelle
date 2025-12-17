// src/types/next-auth.d.ts
import NextAuth, { DefaultSession } from "next-auth";
import { JWT as NextAuthJWT } from "next-auth/jwt";
import { Role, ValidationStatus } from '@prisma/client';

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: Role;
      classeId?: string | null;
      validationStatus?: ValidationStatus; // ✅ ajouté
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
    classeId?: string | null;
    image?: string | null;
    validationStatus?: ValidationStatus; // ✅ ajouté
  }
}

declare module "next-auth/jwt" {
  interface JWT extends NextAuthJWT {
    id?: string;
    role?: Role;
    classeId?: string | null;
    image?: string | null;
    validationStatus?: ValidationStatus; // ✅ ajouté
  }
}