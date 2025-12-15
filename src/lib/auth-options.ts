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
      profile(profile) {
        const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase().trim();
        const userEmail = profile.email.toLowerCase().trim();

        // 🔑 Si c'est le propriétaire → PROFESSEUR + VALIDATED
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

        // ✅ Sinon → ELEVE + PENDING (et NextAuth crée le compte)
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
  allowDangerousEmailAccountLinking: true,
  callbacks: {
    // ✅ Supprimez toute logique de blocage ici
    async signIn({ account }) {
      return !!account; // toujours autoriser
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