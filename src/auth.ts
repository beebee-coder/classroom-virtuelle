// src/auth.ts
import NextAuth from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "./lib/prisma";
import Credentials from "next-auth/providers/credentials";
import type { Provider } from "next-auth/providers";
import bcrypt from "bcryptjs";

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

        // Si l'utilisateur n'existe pas ou n'a pas de mot de passe haché, on refuse.
        if (!user || !user.password) {
          console.log(`[AUTH - Authorize] Utilisateur non trouvé ou mot de passe non défini pour: ${credentials.email}`);
          return null;
        }

        // Comparer le mot de passe fourni avec le mot de passe haché en BDD
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (isPasswordValid) {
          console.log(`✅ [AUTH - Authorize] Authentification réussie pour: ${user.name} (${user.email})`);
          // Retourner l'objet utilisateur sans le mot de passe
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword as any;
        }
        
        console.log(`[AUTH - Authorize] Mot de passe invalide pour: ${credentials.email}`);
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
    error: "/login", // Redirige les erreurs vers la page de connexion
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
        session.user.id = token.id as string;
        session.user.role = token.role as any;
        session.user.classeId = token.classeId as string | undefined;
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === "development",
});
