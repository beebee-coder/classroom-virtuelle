// src/lib/auth-options.ts
import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "./prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { Role, ValidationStatus } from "@prisma/client";

export const authOptions: NextAuthOptions = {
  // ✅ ADAPTATEUR CENTRALISÉ : Gère la création/liaison des utilisateurs
  adapter: PrismaAdapter(prisma),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        name: { label: "Name", type: "text" }, // Pour l'inscription
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

        // Si l'utilisateur n'existe pas, c'est le `signIn` de la page d'inscription.
        // On retourne null, mais l'événement `createUser` ci-dessous sera déclenché.
        if (!user) {
          return null;
        }
        
        // Si l'utilisateur existe mais n'a pas de mot de passe (inscrit via Google)
        if (!user.password) {
           // On ne l'autorise pas à se connecter avec des identifiants
           return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (isPasswordValid) {
          return user; // Retourne l'utilisateur complet si le mot de passe est valide
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
    error: "/login", // Les erreurs (ex: identifiants incorrects) redirigent ici
  },
  
  // ✅ LOGIQUE CENTRALISÉE : Les `events` et `callbacks` sont le cœur du système.
  events: {
    // Déclenché à chaque fois qu'un nouvel utilisateur est créé (formulaire ou Google)
    createUser: async ({ user }) => {
      console.log('🎉 [EVENT] - Nouvel utilisateur créé, ID:', user.id);

      const existingTeacher = await prisma.user.findFirst({
        where: { role: Role.PROFESSEUR, id: { not: user.id } },
      });

      let role: Role = Role.ELEVE;
      let validationStatus: ValidationStatus = ValidationStatus.PENDING;

      if (!existingTeacher) {
        role = Role.PROFESSEUR;
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
    // Après autorisation, enrichit le token JWT
    async jwt({ token, user }) {
      if (user) {
        // Au premier login, `user` est disponible
        token.id = user.id;
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        if (dbUser) {
          token.role = dbUser.role;
          token.validationStatus = dbUser.validationStatus;
          token.classeId = dbUser.classeId;
        }
      }
      return token;
    },

    // Crée la session à partir du token JWT
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.validationStatus = token.validationStatus as ValidationStatus;
        session.user.classeId = token.classeId as string | null;
      }
      return session;
    },

    // ✅ GESTION FINE DES REDIRECTIONS
    async redirect({ url, baseUrl }) {
      // Si la connexion vient de la page d'inscription, on redirige vers le login avec un message.
      if (new URL(url).pathname === '/register') {
        return `${baseUrl}/login?message=registration_success`;
      }
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
  },

  debug: process.env.NODE_ENV === "development",
};
