// src/lib/auth-options.ts
import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "./prisma";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { Role, ValidationStatus } from "@prisma/client";

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
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user || !user.password) return null;
        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (isPasswordValid) {
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
            classeId: user.classeId,
            validationStatus: user.validationStatus,
          };
        }
        return null;
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: { params: { prompt: "select_account" } },
      async profile(profile) {
        const userEmail = profile.email.toLowerCase().trim();
        console.log(`[AUTH PROFILE] Traitement du profil Google pour: ${userEmail}`);

        // 1. Vérifier si l'utilisateur existe déjà
        const existingUser = await prisma.user.findUnique({ where: { email: userEmail } });
        if (existingUser) {
            console.log(`[AUTH PROFILE] -> Utilisateur existant trouvé: ${existingUser.id}. Retour des données actuelles.`);
            return {
                id: existingUser.id,
                name: existingUser.name,
                email: existingUser.email,
                image: existingUser.image,
                role: existingUser.role,
                validationStatus: existingUser.validationStatus,
                classeId: existingUser.classeId,
            };
        }

        // 2. Si c'est un nouvel utilisateur, déterminer son rôle
        const teacherCount = await prisma.user.count({ where: { role: 'PROFESSEUR' } });
        const isFirstUser = teacherCount === 0;

        const role = isFirstUser ? Role.PROFESSEUR : Role.ELEVE;
        const validationStatus = isFirstUser ? ValidationStatus.VALIDATED : ValidationStatus.PENDING;
        
        console.log(`[AUTH PROFILE] -> Nouvel utilisateur. Création avec Rôle: ${role} et Statut: ${validationStatus}`);
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          role: role,
          validationStatus: validationStatus,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async signIn({ user }) {
        if (user.validationStatus === 'PENDING') {
            console.log(`[SIGN IN CALLBACK] - Utilisateur ${user.email} est PENDING. Connexion autorisée, la redirection gérera le reste.`);
        }
        return true; // Toujours autoriser la connexion, la redirection est gérée côté client
    },

    async jwt({ token, user, trigger, session }) {
        if (user) {
            token.id = user.id;
            token.role = user.role as Role;
            token.classeId = user.classeId;
            token.image = user.image;
            token.validationStatus = user.validationStatus as ValidationStatus;
        }

        if (trigger === "update" && session?.validationStatus) {
            token.validationStatus = session.validationStatus as ValidationStatus;
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
  // Le bloc `events` est maintenant géré par le middleware Prisma, on peut le supprimer
  // pour s'assurer qu'il n'y a pas d'import serveur ici.

  debug: process.env.NODE_ENV === "development",
};
