// src/lib/auth-options.ts
import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "./prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { Role, ValidationStatus } from "@prisma/client";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
        
        // Si l'utilisateur n'existe pas ou n'a pas de mot de passe (inscrit via Google), refuser la connexion.
        if (!user || !user.password) {
           return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (isPasswordValid) {
          // Retourne l'utilisateur complet si le mot de passe est valide
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
    // Déclenché à chaque fois qu'un nouvel utilisateur est créé via un fournisseur OAuth (Google)
    createUser: async ({ user }) => {
      console.log('🎉 [EVENT] - Nouvel utilisateur OAuth créé, ID:', user.id);

      const existingTeacher = await prisma.user.findFirst({
        where: { role: Role.PROFESSEUR },
      });

      let role: Role = Role.ELEVE;
      let validationStatus: ValidationStatus = ValidationStatus.PENDING;

      if (!existingTeacher) {
        role = Role.PROFESSESEUR;
        validationStatus = ValidationStatus.VALIDATED;
        console.log(`👑 [EVENT] - Promotion au rôle PROFESSEUR pour ${user.email}`);
      } else {
        console.log(`🧑‍🎓 [EVENT] - Assignation du rôle ELEVE pour ${user.email}`);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { role, validationStatus },
      });
    },
  },

  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        // Pour les nouveaux utilisateurs (après la création), `user` est présent.
        // On récupère les données de la DB pour être sûr.
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        if (dbUser) {
          token.role = dbUser.role;
          token.validationStatus = dbUser.validationStatus;
          token.classeId = dbUser.classeId;
        }
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

    async redirect({ url, baseUrl }) {
      // Pour la connexion normale, rediriger vers la page demandée ou le dashboard.
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },

  debug: process.env.NODE_ENV === "development",
};
