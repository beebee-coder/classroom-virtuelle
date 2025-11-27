// src/lib/auth-options.ts - VERSION COMPLÈTE CORRIGÉE
import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "./prisma";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

// ✅ CORRECTION : Configuration spécifique Vercel
const isProduction = process.env.NODE_ENV === "production";
const baseUrl = process.env.NEXTAUTH_URL || (isProduction ? "https://classroom-virtuelle.vercel.app" : "http://localhost:3000");

// ✅ CORRECTION : Gestion sécurisée de bcrypt pour Vercel
const safeBcryptCompare = async (password: string, hash: string): Promise<boolean> => {
  try {
    if (!password || !hash || password.length > 1000 || hash.length > 100) {
      return false;
    }
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error("🔒 [AUTH] Bcrypt error:", error);
    return false;
  }
};

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
        if (!credentials?.email || !credentials?.password) {
          console.log("❌ [AUTH] Missing credentials");
          return null;
        }
        
        const email = credentials.email.trim().toLowerCase();
        const password = credentials.password;
        
        if (!email || !email.includes('@') || !password || password.length < 1) {
          console.log("❌ [AUTH] Invalid credentials format");
          return null;
        }

        try {
          console.log("🔐 [AUTH] Attempt for:", email);
          
          const user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user) {
            console.log("❌ [AUTH] User not found");
            return null;
          }

          if (!user.password) {
            console.log("❌ [AUTH] User has no password set");
            return null;
          }

          // ✅ CORRECTION : Timeout pour éviter les blocages en production
          const passwordCheck = await Promise.race([
            safeBcryptCompare(password, user.password),
            new Promise<boolean>((resolve) => 
              setTimeout(() => resolve(false), 5000)
            )
          ]);

          console.log("🔑 [AUTH] Password valid:", passwordCheck, "for user:", user.id.substring(0, 8));

          if (passwordCheck) {
            console.log("✅ [AUTH] Authentication successful for:", user.id.substring(0, 8));
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              role: user.role,
              classeId: user.classeId,
            };
          } else {
            console.log("❌ [AUTH] Invalid password for:", user.id.substring(0, 8));
          }
          
          return null;

        } catch (error) {
          console.error("💥 [AUTH] Database or auth error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours - réduit pour Vercel
  },
  pages: {
    signIn: "/login",
    error: "/login",
    signOut: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as Role;
        token.classeId = user.classeId;
        token.image = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.classeId = token.classeId as string | null;
        session.user.image = token.image as string | null;
      }
      
      console.log("🔄 [AUTH] Session callback:", {
        userId: session.user.id?.substring(0, 8),
        role: session.user.role,
        hasClass: !!session.user.classeId
      });
      
      return session;
    },
    async redirect({ url, baseUrl }) {
      try {
        // Permet les redirections relatives
        if (url.startsWith("/")) {
          const redirectUrl = `${baseUrl}${url}`;
          console.log("↪️ [AUTH] Redirecting to:", redirectUrl);
          return redirectUrl;
        }
        // Vérifie que l'URL est du même domaine
        else if (url.startsWith(baseUrl)) {
          console.log("↪️ [AUTH] Redirecting to same domain:", url);
          return url;
        }
        // Retourne à la page d'accueil par défaut
        console.log("↪️ [AUTH] Default redirect to:", baseUrl);
        return baseUrl;
      } catch (error) {
        console.error("💥 [AUTH] Redirect error:", error);
        return baseUrl;
      }
    },
  },
  // ✅ CORRECTION : Configuration optimisée pour Vercel
  debug: process.env.NODE_ENV === "development",
  logger: {
    error(code, metadata) {
      console.error("💥 [AUTH] Error:", code, metadata);
    },
    warn(code) {
      console.warn("⚠️ [AUTH] Warning:", code);
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV === "development") {
        console.log("🐛 [AUTH] Debug:", code, metadata);
      }
    }
  },
  cookies: {
    sessionToken: {
      name: `${isProduction ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
        domain: isProduction ? '.vercel.app' : undefined
      }
    }
  }
};