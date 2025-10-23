// src/lib/auth-options.ts
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { Role } from './types';
import { allDummyStudents } from './dummy-data';

// ---=== BYPASS: LOGIQUE SANS PRISMA ===---
// L'adaptateur Prisma est désactivé. L'authentification est simulée.

const providers: NextAuthOptions['providers'] = [
  CredentialsProvider({
    name: 'Credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials.password) {
        return null;
      }
      
      const isTeacher = credentials.email === 'teacher@example.com';
      const student = allDummyStudents.find(s => s.email === credentials.email);

      // This is for demo purposes only. In a real application,
      // you would hash and compare passwords.
      const isValid = credentials.password === 'password';

      if (isValid) {
        if (isTeacher) {
            return {
              id: 'teacher-id',
              name: 'Professeur Test',
              email: 'teacher@example.com',
              image: null,
              role: Role.PROFESSEUR,
            };
        }
        if (student) {
            return {
              id: student.id,
              name: student.name,
              email: student.email,
              image: student.image,
              role: Role.ELEVE,
              classeId: student.classroomId || undefined,
            };
        }
      }

      return null;
    },
  }),
];

// Conditionally add Google provider only if the keys are present
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}


export const authOptions: NextAuthOptions = {
  theme: {
    logo: "https://next-auth.js.org/img/logo/logo-sm.png",
  },
  providers: providers,
  // L'adaptateur Prisma est supprimé
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // La logique de création d'utilisateur est désactivée car il n'y a plus de DB
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      // console.log('🔐 [AUTH] JWT callback - trigger:', trigger, 'user:', user);
      
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.picture = user.image; // ← CRITIQUE
        token.classeId = user.classeId;
      }
      
      // Update session (when `update()` is called)
      if (trigger === "update" && session) {
        // console.log('🔐 [AUTH] JWT update - session:', session);
        // Handle full user object update
        if (session.user) {
          token.name = session.user.name;
          token.email = session.user.email;
          if (session.user.image) {
            token.picture = session.user.image;
          }
        }
        // Handle simple image update
        else if (session.image) {
          token.picture = session.image;
        }
      }
      return token;
    },
    async session({ session, token }) {
      console.log('🔑 [AUTH] - Callback de session. Token reçu:', JSON.stringify(token, null, 2));
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.classeId = token.classeId as string | undefined;
        session.user.image = token.picture as string | undefined; // ← CRITIQUE
        console.log('✅ [AUTH] - Session enrichie:', JSON.stringify(session.user, null, 2));
      } else {
        console.warn('⚠️ [AUTH] - Token ou session.user manquant.');
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};
