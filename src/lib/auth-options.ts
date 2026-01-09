// src/lib/auth-options.ts
import { type NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "./prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { Role, ValidationStatus } from "@prisma/client";

if (!prisma) {
  throw new Error("PrismaClient is not initialized.");
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const userEmail = credentials.email.toLowerCase().trim();
        const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase().trim();

        if (userEmail !== ownerEmail) {
          console.warn(`[AUTH] Tentative de connexion par mot de passe refusée pour: ${userEmail}.`);
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: userEmail },
        });

        if (!user || !user.password) return null;

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
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
      profile(profile) {
        return {
          id: profile.sub, // ID Google - sera utilisé par PrismaAdapter pour trouver/créer l'utilisateur
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          role: Role.ELEVE,
          validationStatus: ValidationStatus.PENDING,
        };
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
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        const userEmail = profile?.email?.toLowerCase().trim();
        const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase().trim();

        if (userEmail && ownerEmail && userEmail === ownerEmail) {
          return "/register?error=teacher_email_reserved";
        }
      }
      return true;
    },
    async jwt({ token, user, account, profile, trigger, session }) {
      // CORRECTION : Utiliser l'ID de Prisma, pas l'ID Google
      if (user) {
        // Rechercher l'utilisateur dans la base par email pour obtenir le vrai ID Prisma
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email as string },
          select: { id: true, role: true, validationStatus: true, classeId: true }
        });

        if (dbUser) {
          // Utiliser l'ID Prisma, pas l'ID Google
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.validationStatus = dbUser.validationStatus;
          token.classeId = dbUser.classeId;
          token.isNewUser = !dbUser.classeId;
        }
        
        // Conserver les autres données du user
        token.image = user.image;
        token.name = user.name;
        token.email = user.email;
      }

      // À chaque appel (connexion ou `update()`)
      if (token.email) {
        // Rechercher par email à chaque fois pour être sûr d'avoir les données à jour
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
          select: { validationStatus: true, classeId: true },
        });

        if (dbUser) {
          token.validationStatus = dbUser.validationStatus;
          token.classeId = dbUser.classeId;
          // CORRECTION: isNewUser = true SEULEMENT si pas de classeId
          token.isNewUser = !dbUser.classeId;
        }
      }
      return token;
    },
    async session({ session, token }) {
      console.log('[AUTH SESSION] Création de session:', {
        id: token.id,
        isNewUser: token.isNewUser,
        classeId: token.classeId
      });
      if (token && session.user) {
        // CORRECTION : Utiliser l'ID Prisma qui vient du callback jwt
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.validationStatus = token.validationStatus as ValidationStatus;
        session.user.classeId = token.classeId as string | null;
        session.user.image = token.image as string | null;
        session.user.name = token.name as string | null;
        session.user.email = token.email as string | null;
        session.user.isNewUser = token.isNewUser as boolean | undefined;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (user.role === Role.ELEVE) {
        try {
          const { ablyTrigger } = await import("@/lib/ably/triggers");
          const { AblyEvents } = await import("@/lib/ably/events");
          const { getUserChannelName } = await import("@/lib/ably/channels");

          const teacher = await prisma.user.findFirst({
            where: { role: Role.PROFESSEUR },
            select: { id: true },
          });

          if (teacher) {
            await ablyTrigger(
              getUserChannelName(teacher.id),
              AblyEvents.NEW_PENDING_STUDENT,
              {
                studentId: user.id,
                studentName: user.name,
                studentEmail: user.email,
                teacherId: teacher.id,
              }
            );
          }
        } catch (error) {
          console.error("[AUTH EVENT] Échec de la notification Ably pour nouvel élève:", error);
        }
      }
    },
  },
  debug: process.env.NODE_ENV === "development",
};
