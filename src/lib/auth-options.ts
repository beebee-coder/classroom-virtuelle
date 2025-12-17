// src/lib/auth-options.ts
import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "./prisma";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { Role, ValidationStatus } from "@prisma/client";

// 🔹 Types étendus pour inclure validationStatus
interface ExtendedUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: Role;
  classeId?: string | null;
  validationStatus: ValidationStatus;
}

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn("[AUTH] Google OAuth non configuré (credentials manquants)");
}
const OWNER_EMAIL = process.env.OWNER_EMAIL?.toLowerCase().trim();
if (!OWNER_EMAIL) {
  console.warn("[AUTH] OWNER_EMAIL non défini – le premier utilisateur Google ne sera pas auto-promu professeur");
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.warn("[AUTH/CREDENTIALS] Champs manquants");
          return null;
        }

        try {
          console.log("[AUTH/CREDENTIALS] Tentative de connexion", { email: credentials.email });
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });

          if (!user) {
            console.log("[AUTH/CREDENTIALS] Utilisateur non trouvé", { email: credentials.email });
            return null;
          }

          if (!user.password) {
            console.log("[AUTH/CREDENTIALS] Utilisateur sans mot de passe (connexion OAuth uniquement)", { email: user.email });
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          console.log("[AUTH/CREDENTIALS] Résultat vérification mot de passe", { email: user.email, valid: isPasswordValid });

          if (isPasswordValid) {
            // ✅ Cast explicite vers ExtendedUser (sans password)
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              role: user.role,
              classeId: user.classeId,
              validationStatus: user.validationStatus,
            } satisfies ExtendedUser;
          }
          return null;
        } catch (error) {
          console.error("[AUTH/CREDENTIALS] Erreur d'authentification", {
            email: credentials.email,
            error: error instanceof Error ? error.message : String(error),
          });
          return null;
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile(profile) {
        const email = profile.email.toLowerCase().trim();
        const isOwner = email === OWNER_EMAIL;

        console.log("[AUTH/GOOGLE] Profil reçu", { email, isOwner, OWNER_EMAIL });

        let role: Role = Role.ELEVE;
        let validationStatus: ValidationStatus = ValidationStatus.PENDING;

        if (isOwner) {
          role = Role.PROFESSEUR;
          validationStatus = ValidationStatus.VALIDATED;
          console.log("[AUTH/GOOGLE] Attribution PROFESSEUR (OWNER_EMAIL)", { email });
        } else {
          console.log("[AUTH/GOOGLE] Attribution ELEVE (non propriétaire)", { email });
        }

        return {
          id: profile.sub,
          name: profile.name,
          email: email,
          image: profile.picture,
          role,
          validationStatus,
        } satisfies ExtendedUser;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const extendedUser = user as ExtendedUser;
        token.id = extendedUser.id;
        token.role = extendedUser.role;
        token.classeId = extendedUser.classeId;
        token.image = extendedUser.image;
        token.validationStatus = extendedUser.validationStatus; // ✅ OK maintenant
        console.log("[AUTH/JWT] Token initialisé", {
          userId: extendedUser.id,
          email: extendedUser.email,
          role: extendedUser.role,
          validationStatus: extendedUser.validationStatus,
        });
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.classeId = token.classeId as string | null;
        session.user.image = token.image as string | null;
        session.user.validationStatus = token.validationStatus as ValidationStatus;
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === "development",
};