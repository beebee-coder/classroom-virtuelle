// src/auth.ts
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "./lib/prisma";
import Credentials from "next-auth/providers/credentials";
import type { Provider } from "next-auth/providers";
import { User } from "@prisma/client";

const providers: Provider[] = [
  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        console.error('❌ [AUTH - Authorize] Échec: Email ou mot de passe manquant.');
        return null;
      }
      try {
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (user && credentials.password === 'password') {
          console.log(`✅ [AUTH - Authorize] Authentification réussie pour: ${user.name} (${user.email})`);
          return user as any;
        }
        return null;
      } catch (error) {
        console.error("💥 [AUTH - Authorize] Erreur critique:", error);
        return null;
      }
    },
  }),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers,
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
        token.id = user.id;
        token.role = user.role;
        token.classeId = user.classeId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        if (token.id) {
            session.user.id = token.id as string;
        }
        session.user.role = token.role as any;
        session.user.classeId = token.classeId as string | undefined;
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === "development",
});
