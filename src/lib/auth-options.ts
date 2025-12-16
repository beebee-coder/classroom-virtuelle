// src/lib/auth-options.ts
import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "./prisma";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { Role, ValidationStatus } from "@prisma/client";
import { ablyTrigger } from "./ably/triggers";
import { AblyEvents } from "./ably/events";

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
        const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase().trim();
        const userEmail = profile.email.toLowerCase().trim();

        // Si c'est le propriétaire → PROFESSEUR + VALIDATED
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
        
        // Si ce n'est pas le propriétaire, vérifier si c'est un nouvel utilisateur ou un utilisateur existant
        const existingUser = await prisma.user.findUnique({ where: { email: userEmail } });
        
        if (existingUser) {
            // L'utilisateur existe déjà, on retourne ses informations actuelles pour ne pas écraser son statut/rôle
             return {
                id: existingUser.id,
                name: existingUser.name,
                email: existingUser.email,
                image: existingUser.image,
                role: existingUser.role,
                validationStatus: existingUser.validationStatus,
            };
        }

        // Nouvel utilisateur → ELEVE + PENDING
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
  events: {
    async createUser(message) {
        const user = message.user;
        if (user.role === Role.ELEVE && user.validationStatus === ValidationStatus.PENDING) {
            console.log(`[CREATE USER EVENT] Nouvel élève créé via provider: ${user.id}. Diffusion de l'événement.`);
            try {
                 await ablyTrigger('classroom-connector:pending-students', AblyEvents.STUDENT_PENDING, {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    createdAt: new Date().toISOString()
                });
                console.log(`[CREATE USER EVENT] Événement Ably diffusé avec succès.`);
            } catch (ablyError) {
                 console.error('[CREATE USER EVENT] Erreur lors de la diffusion de l\'événement Ably:', ablyError);
            }
        }
    }
  },

  debug: process.env.NODE_ENV === "development",
};
