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
      profile(profile) {
        // Logique pour déterminer le rôle lors de l'inscription via Google
        const isOwner = profile.email === process.env.OWNER_EMAIL;
        const role = isOwner ? Role.PROFESSEUR : Role.ELEVE;
        const validationStatus = isOwner ? ValidationStatus.VALIDATED : ValidationStatus.PENDING;

        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          role: role,
          validationStatus: validationStatus,
        };
      },
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
        
        if (!user || !user.password) {
           return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (isPasswordValid) {
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
    createUser: async ({ user }) => {
      console.log('🎉 [EVENT] - Nouvel utilisateur créé (formulaire ou 1ère connexion OAuth), ID:', user.id);
      
      const isFirstUser = (await prisma.user.count()) === 1;
      const isOwnerByEmail = user.email === process.env.OWNER_EMAIL;

      let role: Role = Role.ELEVE;
      let validationStatus: ValidationStatus = ValidationStatus.PENDING;

      if (isFirstUser || isOwnerByEmail) {
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
      
      await prisma.etatEleve.create({
        data: {
          eleveId: user.id
        }
      })
    },
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Après une connexion/inscription, les données de l'utilisateur sont passées ici.
        // On les ajoute au token JWT.
        token.id = user.id;
        token.role = user.role;
        token.validationStatus = user.validationStatus;
        token.classeId = user.classeId;
      }
      return token;
    },

    async session({ session, token }) {
      // La session côté client est enrichie avec les données du token.
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.validationStatus = token.validationStatus as ValidationStatus;
        session.user.classeId = token.classeId as string | null;
      }
      return session;
    },
  },

  debug: process.env.NODE_ENV === "development",
  // Ajout de la propriété issuer pour résoudre l'erreur Invalid URL de manière définitive
  issuer: process.env.NEXTAUTH_URL,
};
