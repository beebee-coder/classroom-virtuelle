// src/types/next-auth.d.ts
import type { DefaultSession, User } from 'next-auth';
import type { Role } from '@prisma/client';

declare module 'next-auth' {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user?: {
      id: string;
      role: Role;
      classeId?: string | null; // Can be null
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    role: Role;
    classeId?: string | null; // Can be null
  }
}

declare module 'next-auth/jwt' {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    id: string;
    role: Role;
    classeId?: string | null;
  }
}
