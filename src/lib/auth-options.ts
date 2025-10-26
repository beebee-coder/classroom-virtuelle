// src/lib/auth-options.ts
import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import type { User as PrismaUser, Role } from '@prisma/client';

// Définition de l'interface pour étendre le type User
interface CustomUser extends Omit<PrismaUser, 'emailVerified'> {
  emailVerified: Date | null;
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
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
          console.log(`🔍 [AUTH - Authorize] Recherche de l'utilisateur: ${credentials.email}`);
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user) {
            console.warn(`⚠️ [AUTH - Authorize] Utilisateur non trouvé: ${credentials.email}`);
            return null;
          }

          // Pour la démo, on accepte le mot de passe 'password'
          if (credentials.password !== 'password') {
            console.warn(`🔒 [AUTH - Authorize] Mot de passe incorrect pour: ${credentials.email}`);
            return null;
          }

          console.log(`✅ [AUTH - Authorize] Authentification réussie pour: ${user.name} (${user.email})`);
          return user as any;

        } catch (error) {
          console.error("💥 [AUTH - Authorize] Erreur critique:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        console.log('📝 [AUTH - JWT Callback] Enrichissement du token lors de la connexion.');
        token.id = user.id;
        const prismaUser = user as CustomUser;
        token.role = prismaUser.role;
        token.classeId = prismaUser.classeId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.classeId = token.classeId as string | undefined;
      }
      return session;
    },
  },
};
