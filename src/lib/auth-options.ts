// src/lib/auth-options.ts
import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import prisma from './prisma';
import { Role } from '@prisma/client';

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      async profile(profile) {
        // Personnalisation du profil lors de l'inscription via Google
        const user = {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          role: Role.ELEVE, // Par défaut, un nouvel utilisateur est un élève
        };
        
        // Logique pour créer l'utilisateur en base s'il n'existe pas
        await prisma.user.upsert({
            where: { email: profile.email },
            update: { name: profile.name, image: profile.picture },
            create: {
                id: profile.sub,
                email: profile.email,
                name: profile.name,
                image: profile.picture,
                role: Role.ELEVE,
            },
        });
        return user;
      }
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log('🔑 [AUTH] Authorize function called with credentials:', credentials?.email);
        
        if (!credentials?.email || !credentials.password) {
          console.log('  -> Missing credentials');
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          console.log('  -> User not found in database');
          return null;
        }
        
        // ATTENTION: En production, le mot de passe doit être hashé et comparé.
        // Pour la démo, nous utilisons un mot de passe statique.
        const isValid = credentials.password === 'password';

        if (isValid) {
          console.log(`✅ [AUTH] User ${user.email} authenticated successfully.`);
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role,
            classeId: user.classeId,
          };
        }
        
        console.log(`❌ [AUTH] Authentication failed for ${credentials.email}.`);
        return null;
      },
    }),
  ],
  session: {
    strategy: 'jwt',
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
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.classeId = token.classeId as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login', // Redirect to login page on error
  },
  secret: process.env.NEXTAUTH_SECRET,
};
