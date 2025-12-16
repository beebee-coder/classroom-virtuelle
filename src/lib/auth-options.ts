// src/lib/auth-options.ts
import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "./prisma";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { Role, ValidationStatus } from "@prisma/client";

// 🔹 Import pour publier un événement Ably
import { broadcastNewPendingStudent } from '@/lib/actions/ably-session.actions';

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
      async profile(profile, tokens) {
        const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase().trim();
        const userEmail = profile.email.toLowerCase().trim();

        // Tenter de lier le compte Google à un utilisateur existant par email
        const existingUser = await prisma.user.findUnique({ where: { email: userEmail } });
        if (existingUser) {
          // Si l'utilisateur existe, lier le compte sans changer le rôle
          await prisma.account.upsert({
            where: {
              provider_providerAccountId: {
                provider: 'google',
                providerAccountId: profile.sub,
              },
            },
            update: {
              access_token: tokens.access_token,
              expires_at: tokens.expires_at,
              refresh_token: tokens.refresh_token,
              scope: tokens.scope,
              token_type: tokens.token_type,
            },
            create: {
              userId: existingUser.id,
              type: 'oauth',
              provider: 'google',
              providerAccountId: profile.sub,
              access_token: tokens.access_token,
              expires_at: tokens.expires_at,
              refresh_token: tokens.refresh_token,
              scope: tokens.scope,
              token_type: tokens.token_type,
            },
          });
          return {
            ...existingUser,
            id: existingUser.id,
            role: existingUser.role, // Conserver le rôle existant
            validationStatus: existingUser.validationStatus,
          };
        }

        // Si l'utilisateur n'existe pas, créer un nouveau profil
        if (ownerEmail && userEmail === ownerEmail) {
          return {
            id: profile.sub,
            name: profile.name,
            email: profile.email,
            image: profile.picture,
            role: "PROFESSEUR" as Role,
            validationStatus: "VALIDATED" as ValidationStatus,
          };
        }

        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          role: "ELEVE" as Role,
          validationStatus: "PENDING" as ValidationStatus,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  events: {
    async createUser({ user }) {
      if (user.role === "ELEVE") {
        try {
          await broadcastNewPendingStudent({
            id: user.id,
            name: user.name ?? null,
            email: user.email ?? null,
          });
          console.log(`🔔 [AUTH EVENT] Événement temps réel envoyé pour le nouvel élève en attente : ${user.email}`);
        } catch (error) {
          console.error(`❌ [AUTH EVENT] Échec de la diffusion de l'événement pour le nouvel élève:`, error);
        }
      }
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as Role;
        token.classeId = user.classeId;
        token.image = user.image;
        token.validationStatus = user.validationStatus as ValidationStatus;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.classeId = token.classeId as string | null;
        session.user.image = token.image as string | null;
        session.user.validationStatus = token.validationStatus as ValidationStatus;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) return url;
      if (url.startsWith("/")) return new URL(url, baseUrl).toString();
      return baseUrl;
    },
  },
  debug: process.env.NODE_ENV === "development",
};
