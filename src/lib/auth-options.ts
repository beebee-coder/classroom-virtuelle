// src/lib/auth-options.ts
import { type NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "./prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { Role, ValidationStatus } from "@prisma/client";

// Import Ably en haut du fichier (statique, pas dynamique)
import { ablyTrigger } from "@/lib/ably/triggers";
import { AblyEvents } from "@/lib/ably/events";
import { getUserChannelName } from "@/lib/ably/channels";

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
        console.group("[AUTH - CREDENTIALS] 🔐 Tentative de connexion par credentials");
        console.log("📧 Email reçu:", credentials?.email ? `${credentials.email.substring(0, 3)}...` : "non fourni");
        
        if (!credentials?.email || !credentials?.password) {
          console.warn("❌ Credentials incomplets");
          console.groupEnd();
          return null;
        }

        const userEmail = credentials.email.toLowerCase().trim();
        // Utilisation de la nouvelle variable d'environnement publique
        const ownerEmail = process.env.NEXT_PUBLIC_OWNER_EMAIL?.toLowerCase().trim();

        console.log("🔍 Vérification du propriétaire...");
        console.log("📧 Email utilisateur:", userEmail);
        // Log pour vérifier si la variable est chargée en production
        console.log("👑 Email propriétaire configuré:", ownerEmail ? "Défini" : "NON DÉFINI");

        if (!ownerEmail) {
            console.error("💥 ERREUR CRITIQUE: La variable d'environnement NEXT_PUBLIC_OWNER_EMAIL n'est pas définie sur le serveur de déploiement.");
            console.groupEnd();
            return null;
        }

        if (userEmail !== ownerEmail) {
          console.warn("⛔ Connexion refusée: email n'est pas celui du propriétaire");
          console.groupEnd();
          return null;
        }

        console.log("🔍 Recherche de l'utilisateur dans la base...");
        const user = await prisma.user.findUnique({
          where: { email: userEmail },
        });

        if (!user) {
          console.warn("❌ Utilisateur non trouvé dans la base");
          console.groupEnd();
          return null;
        }

        if (!user.password) {
          console.warn("❌ Utilisateur n'a pas de mot de passe (connexion OAuth uniquement)");
          console.groupEnd();
          return null;
        }

        console.log("🔐 Vérification du mot de passe...");
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (isPasswordValid) {
          console.log("✅ Connexion credentials réussie!");
          console.log("👤 Utilisateur autorisé:", {
            id: user.id.substring(0, 8) + "...",
            email: user.email,
            role: user.role,
            classeId: user.classeId,
            validationStatus: user.validationStatus
          });
          console.groupEnd();
          
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
        
        console.warn("❌ Mot de passe invalide");
        console.groupEnd();
        return null;
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile(profile) {
        console.group("[AUTH - GOOGLE] 🌐 Profil Google reçu");
        console.log("👤 Informations du profil Google:", {
          sub: profile.sub.substring(0, 8) + "...",
          name: profile.name,
          email: profile.email,
          picture: profile.picture ? "présente" : "absente"
        });
        console.groupEnd();
        
        return {
          id: profile.sub,
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
      console.group("[AUTH - SIGNIN] 🚪 Callback signIn");
      console.log("🔧 Provider:", account?.provider);
      
      if (account?.provider === "google") {
        const userEmail = profile?.email?.toLowerCase().trim();
        const ownerEmail = process.env.NEXT_PUBLIC_OWNER_EMAIL?.toLowerCase().trim();

        console.log("📧 Email Google:", userEmail);
        console.log("👑 Email propriétaire:", ownerEmail);

        if (userEmail && ownerEmail && userEmail === ownerEmail) {
          console.warn("⛔ Email du propriétaire détecté - redirection vers register");
          console.groupEnd();
          return "/register?error=teacher_email_reserved";
        }
      }
      
      console.log("✅ SignIn autorisé");
      console.groupEnd();
      return true;
    },
    
    async jwt({ token, user, account, profile, trigger, session }) {
      console.group("[AUTH - JWT] 🔑 Callback JWT");
      console.log("📊 État initial du token:", {
        id: token.id ? `${token.id.substring(0, 8)}...` : "non défini",
        email: token.email,
        role: token.role,
        isNewUser: token.isNewUser,
        trigger: trigger
      });

      // Au moment de la connexion initiale
      if (user) {
        console.log("👤 Données utilisateur reçues:", {
          id: user.id ? `${user.id.substring(0, 8)}...` : "non défini",
          email: user.email,
          role: user.role
        });

        // Rechercher l'utilisateur dans la base par email pour obtenir le vrai ID Prisma
        console.log("🔍 Recherche de l'utilisateur dans la base par email...");
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email as string },
          select: { id: true, role: true, validationStatus: true, classeId: true }
        });

        if (dbUser) {
          console.log("✅ Utilisateur trouvé dans la base:", {
            idPrisma: dbUser.id.substring(0, 8) + "...",
            role: dbUser.role,
            validationStatus: dbUser.validationStatus,
            classeId: dbUser.classeId
          });
          
          // Utiliser l'ID Prisma, pas l'ID Google
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.validationStatus = dbUser.validationStatus;
          token.classeId = dbUser.classeId;
          token.isNewUser = !dbUser.classeId;
          
          console.log("🔄 Token mis à jour avec l'ID Prisma");
        } else {
          console.error("❌ Utilisateur NON trouvé dans la base avec l'email:", user.email);
        }
        
        // Conserver les autres données du user
        token.image = user.image;
        token.name = user.name;
        token.email = user.email;
      }

      // À chaque appel (connexion ou `update()`)
      if (token.email) {
        console.log("🔄 Rafraîchissement des données utilisateur depuis la base...");
        
        // Rechercher par email à chaque fois pour être sûr d'avoir les données à jour
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
          select: { validationStatus: true, classeId: true },
        });

        if (dbUser) {
          console.log("📊 Données mises à jour depuis la base:", {
            validationStatus: dbUser.validationStatus,
            classeId: dbUser.classeId
          });
          
          token.validationStatus = dbUser.validationStatus;
          token.classeId = dbUser.classeId;
          // CORRECTION: isNewUser = true SEULEMENT si pas de classeId
          token.isNewUser = !dbUser.classeId;
          
          console.log("✅ Token rafraîchi, isNewUser =", !dbUser.classeId);
        } else {
          console.warn("⚠️ Impossible de rafraîchir les données: utilisateur non trouvé avec l'email");
        }
      }

      console.log("📤 Token final:", {
        id: token.id ? `${token.id.substring(0, 8)}...` : "non défini",
        email: token.email,
        role: token.role,
        isNewUser: token.isNewUser,
        validationStatus: token.validationStatus,
        classeId: token.classeId
      });
      console.groupEnd();
      return token;
    },
    
    async session({ session, token }) {
      console.group("[AUTH - SESSION] 👥 Callback Session");
      console.log("📥 Session initiale:", {
        userEmail: session.user?.email,
        userRole: session.user?.role
      });
      console.log("🔑 Token reçu:", {
        id: token.id ? `${token.id.substring(0, 8)}...` : "non défini",
        email: token.email,
        role: token.role,
        isNewUser: token.isNewUser
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
        
        console.log("✅ Session enrichie avec les données du token:", {
          id: session.user.id.substring(0, 8) + "...",
          role: session.user.role,
          isNewUser: session.user.isNewUser,
          validationStatus: session.user.validationStatus,
          classeId: session.user.classeId
        });
      } else {
        console.warn("⚠️ Token ou session.user manquant");
      }
      
      console.groupEnd();
      return session;
    },
  },
  
  events: {
    async createUser({ user }) {
      console.group("[AUTH - EVENT] 🎉 Événement createUser");
      console.log("👤 Nouvel utilisateur créé:", {
        id: user.id.substring(0, 8) + "...",
        email: user.email,
        role: user.role,
        name: user.name
      });

      if (user.role === Role.ELEVE) {
        try {
          console.log("🔔 Nouvel élève détecté - Recherche d'un professeur...");
          
          const teacher = await prisma.user.findFirst({
            where: { role: Role.PROFESSEUR },
            select: { id: true },
          });

          if (teacher) {
            console.log("👨‍🏫 Professeur trouvé:", {
              id: teacher.id.substring(0, 8) + "..."
            });
            
            console.log("📨 Envoi de notification Ably au professeur...");
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
            
            console.log("✅ Notification Ably envoyée avec succès");
          } else {
            console.warn("⚠️ Aucun professeur trouvé - notification Ably ignorée");
          }
        } catch (error) {
          console.error("❌ Échec de la notification Ably pour nouvel élève:", error);
        }
      } else {
        console.log("ℹ️ Utilisateur n'est pas un élève - événement ignoré");
      }
      
      console.groupEnd();
    },
  },
  
  debug: process.env.NODE_ENV === "development",
};
