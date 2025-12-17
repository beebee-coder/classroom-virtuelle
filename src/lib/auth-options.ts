// src/lib/auth-options.ts
import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "./prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { Role, ValidationStatus } from "@prisma/client";

// Définir l'URL de base pour NextAuth.js
process.env.NEXTAUTH_URL = process.env.APP_HOST;

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  trustHost: true, // Nécessaire pour les environnements non-Vercel

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile(profile) {
        const isOwner = profile.email === process.env.OWNER_EMAIL;
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          role: isOwner ? Role.PROFESSEUR : Role.ELEVE,
          validationStatus: isOwner ? ValidationStatus.VALIDATED : ValidationStatus.PENDING,
        };
      },
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (isPasswordValid) {
          return user;
        }

        return null;
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
  
  events: {
    createUser: async ({ user }) => {
      // S'assure que le champ `etat` est créé pour chaque nouvel utilisateur
      await prisma.etatEleve.create({
        data: {
          eleveId: user.id
        }
      });
    },
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.validationStatus = user.validationStatus;
        token.classeId = user.classeId;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.validationStatus = token.validationStatus as ValidationStatus;
        session.user.classeId = token.classeId as string | null;
      }
      return session;
    },
  },

  debug: process.env.NODE_ENV === "development",
};
