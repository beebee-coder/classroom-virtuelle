// src/types/next-auth.d.ts
import NextAuth, { DefaultSession } from "next-auth";
import { JWT as NextAuthJWT } from "next-auth/jwt";
import { Role, ValidationStatus } from '@prisma/client';

// 🔹 Étendre AuthOptions pour inclure allowDangerousEmailAccountLinking
declare module "next-auth" {
  interface AuthOptions {
    allowDangerousEmailAccountLinking?: boolean;
  }

  interface Session {
    user: {
      id: string;
      role?: Role;
      classeId?: string | null;
      validationStatus?: ValidationStatus;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
    classeId?: string | null;
    image?: string | null;
    validationStatus?: ValidationStatus;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends NextAuthJWT {
    id?: string;
    role?: Role;
    classeId?: string | null;
    image?: string | null;
    validationStatus?: ValidationStatus;
  }
}