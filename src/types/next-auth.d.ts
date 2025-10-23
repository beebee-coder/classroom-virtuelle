// src/types/next-auth.d.ts
import type { DefaultSession, User } from 'next-auth';
import { Role } from '@/lib/types'; // Importer depuis la source unique

declare module 'next-auth' {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user?: {
      id: string;
      role: Role;
      classeId?: string;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    role: Role;
    classeId?: string;
  }
}

declare module 'next-auth/jwt' {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    id: string;
    role: Role;
    classeId?: string;
  }
}
