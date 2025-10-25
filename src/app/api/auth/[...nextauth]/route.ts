
// app/api/auth/[...nextauth]/route.ts
import NextAuth, { AuthOptions, User } from "next-auth"
import { JWT } from "next-auth/jwt"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log(`🔑 [AUTH - Authorize] Début du processus pour: ${credentials?.email}`);
        try {
          if (!credentials?.email || !credentials?.password) {
            console.error('❌ [AUTH - Authorize] Échec: Email ou mot de passe manquant.');
            throw new Error("Email et mot de passe requis")
          }

          console.log(`🔍 [AUTH - Authorize] Recherche de l'utilisateur: ${credentials.email}`);
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          })

          if (!user) {
            console.warn(`⚠️ [AUTH - Authorize] Utilisateur non trouvé: ${credentials.email}`);
            throw new Error("Utilisateur non trouvé")
          }

          // Pour la démo, on accepte le mot de passe 'password'
          if (credentials.password !== 'password') {
             console.warn(`🔒 [AUTH - Authorize] Mot de passe incorrect pour: ${credentials.email}`);
             throw new Error("Mot de passe incorrect")
          }

          console.log(`✅ [AUTH - Authorize] Authentification réussie pour: ${user.name} (${user.email})`);
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            classeId: user.classeId
          }
        } catch (error) {
          console.error("💥 [AUTH - Authorize] Erreur critique:", error);
          return null
        }
      }
    })
  ],
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      console.log('📝 [AUTH - JWT Callback] Exécution du callback JWT.');
      if (user) {
        console.log('  -> Nouvel utilisateur détecté, mise à jour du token.');
        token.id = user.id
        token.role = user.role
        token.classeId = user.classeId
      }
      console.log('  -> Token final:', token);
      return token
    },
    async session({ session, token }: { session: any; token: JWT }) {
      console.log('👤 [AUTH - Session Callback] Exécution du callback de session.');
      if (token && session.user) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.classeId = token.classeId
        console.log('  -> Session utilisateur enrichie avec les données du token.');
      }
      console.log('  -> Session finale envoyée au client:', session);
      return session
    },
  },
  debug: process.env.NODE_ENV === "development",
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
