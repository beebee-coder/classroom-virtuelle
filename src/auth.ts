// src/auth.ts
import NextAuth from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "./lib/prisma";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

console.log("🔵 [auth.ts] - Module en cours d'évaluation...");

// La configuration est maintenant encapsulée pour exporter `handlers`
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("🔵 [AUTH - Authorize] - Démarrage de l'autorisation...");
        if (!credentials?.email || !credentials?.password) {
          console.error('❌ [AUTH - Authorize] Échec: Email ou mot de passe manquant.');
          return null;
        }
        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });

          if (!user || !user.password) {
            console.log(`[AUTH - Authorize] Utilisateur non trouvé ou mot de passe non défini pour: ${credentials.email}`);
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (isPasswordValid) {
            console.log(`✅ [AUTH - Authorize] Authentification réussie pour: ${user.name} (${user.email})`);
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
      console.log("🔵 [AUTH - jwt callback] - Exécution...");
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.classeId = user.classeId;
      }
      return token;
    },
    async session({ session, token }) {
      console.log("🔵 [AUTH - session callback] - Exécution...");
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

console.log("🔵 [auth.ts] - Évaluation terminée. handlers:", typeof handlers);
