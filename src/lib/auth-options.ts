// src/lib/auth-options.ts
import { AuthOptions, User } from "next-auth"
import { JWT } from "next-auth/jwt"
import CredentialsProvider from "next-auth/providers/credentials"
import prisma from "@/lib/prisma"

// Interface pour étendre le type User avec nos champs personnalisés
interface CustomUser extends User {
  role?: string;
  classeId?: string;
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.error('❌ [AUTH - Authorize] Échec: Email ou mot de passe manquant.');
          return null;
        }

        try {
          console.log(`🔍 [AUTH - Authorize] Recherche de l'utilisateur: ${credentials.email}`);
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          })

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
          
          const customUser: CustomUser = {
            id: user.id,
            email: user.email || '',
            name: user.name || '',
            role: user.role,
            classeId: user.classeId || undefined
          }
          
          return customUser;
        } catch (error) {
          console.error("💥 [AUTH - Authorize] Erreur critique:", error);
          return null;
        }
      }
    })
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
      console.log('📝 [AUTH - JWT Callback] Exécution du callback JWT.');
      
      if (user) {
        const customUser = user as CustomUser;
        console.log('  -> Nouvel utilisateur détecté, mise à jour du token.');
        token.id = customUser.id;
        token.role = customUser.role;
        token.classeId = customUser.classeId;
      }
      
      console.log('  -> Token final:', { 
        id: token.id, 
        role: token.role, 
        classeId: token.classeId,
        email: token.email 
      });
      return token;
    },
    
    async session({ session, token }) {
      console.log('👤 [AUTH - Session Callback] Exécution du callback de session.');
      
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.classeId = token.classeId as string | undefined;
        console.log('  -> Session utilisateur enrichie avec les données du token.');
      }
      
      console.log('  -> Session finale:', {
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
          classeId: session.user.classeId
        }
      });
      return session;
    },
  },
}
