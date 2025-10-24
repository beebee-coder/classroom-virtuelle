// types/next-auth.d.ts
import NextAuth, { DefaultSession } from "next-auth"
import { JWT as NextAuthJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role?: string
      classeId?: string | null;
    } & DefaultSession["user"]
  }

  interface User {
    role?: string;
    classeId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends NextAuthJWT {
    id: string
    role?: string
    classeId?: string | null;
  }
}
