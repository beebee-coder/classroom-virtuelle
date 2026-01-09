# Référence du Flux d'Authentification Fonctionnel

Ce document contient un enregistrement du code des fichiers clés qui composent le système d'authentification et d'inscription fonctionnel de l'application, basé sur une séparation stricte des rôles.

- **Professeur (Propriétaire)** : Connexion via **email/mot de passe uniquement**.
- **Élèves** : Connexion/Inscription via **Google uniquement**.

---

## 1. Options d'Authentification (`src/lib/auth-options.ts`)

Ce fichier définit la stratégie d'authentification, les fournisseurs (`Credentials` pour le professeur, `Google` pour les élèves), et les callbacks pour gérer les sessions et les tokens JWT. La stratégie de session est `jwt` pour la performance et la fiabilité.

```typescript
// src/lib/auth-options.ts
import { type NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "./prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { Role, ValidationStatus } from "@prisma/client";

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
        if (!credentials?.email || !credentials?.password) return null;

        const userEmail = credentials.email.toLowerCase().trim();
        const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase().trim();

        // 🔒 Le fournisseur de mot de passe est exclusivement pour le propriétaire.
        if (userEmail !== ownerEmail) {
          console.warn(`[AUTH] Tentative de connexion par mot de passe refusée pour: ${userEmail}.`);
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: userEmail },
        });

        if (!user || !user.password) return null;

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (isPasswordValid) {
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
        return null;
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile(profile) {
        // 🔒 Le fournisseur Google est exclusivement pour les élèves.
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          role: Role.ELEVE, // Toujours ELEVE
          validationStatus: ValidationStatus.PENDING, // Toujours en attente de validation
        };
      },
    }),
  ],
  session: {
    strategy: "jwt", // ✅ Stratégie JWT pour la fiabilité
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      // ✅ Copie les données de l'utilisateur dans le token JWT lors de la connexion.
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.validationStatus = user.validationStatus;
        token.classeId = user.classeId;
        token.image = user.image;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      // ✅ Hydrate la session client avec les données du token.
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.validationStatus = token.validationStatus as ValidationStatus;
        session.user.classeId = token.classeId as string | null;
        session.user.image = token.image as string | null;
        session.user.name = token.name as string | null;
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === "development",
};
```

---

## 2. Route API d'Inscription (`src/app/api/auth/register/route.ts`)

Cette route est **uniquement** pour l'inscription du compte Professeur (Propriétaire) via le formulaire. Elle rejette toute tentative d'inscription avec un autre email.

```typescript
// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role, ValidationStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Tous les champs sont requis." },
        { status: 400 }
      );
    }

    const userEmail = email.toLowerCase().trim();
    const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase().trim();

    // 🔒 L'inscription par formulaire est exclusivement réservée au propriétaire.
    if (userEmail !== ownerEmail) {
      return NextResponse.json(
        { error: "L'inscription pour ce compte doit se faire via Google." },
        { status: 403 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Un compte avec cet email existe déjà." },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email: userEmail,
        password: hashedPassword,
        role: Role.PROFESSEUR, // Toujours PROFESSEUR
        validationStatus: ValidationStatus.VALIDATED, // Toujours VALIDATED
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        validationStatus: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });

  } catch (error) {
    console.error("[API/REGISTER] 💥 Erreur inscription:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de l'inscription." },
      { status: 500 }
    );
  }
}
```

---

## 3. Formulaire de Connexion (`src/app/login/login-form.tsx`)

Le formulaire de connexion a été simplifié pour guider clairement les utilisateurs : un bouton Google pour les élèves, et des champs email/mot de passe pour le professeur. Il gère la redirection post-connexion de manière fiable grâce à `router.refresh()`.

```typescript
// src/app/login/login-form.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2, User, Lock, School, ArrowLeft, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import Image from 'next/image';
import { FaGoogle } from 'react-icons/fa';

export default function LoginForm() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();

  const errorParam = searchParams?.get('error');
  const messageParam = searchParams?.get('message');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    if (errorParam) {
      if (errorParam === 'CredentialsSignin') {
         setError("Email ou mot de passe incorrect pour le compte professeur.");
      } else {
        setError("Une erreur de connexion est survenue. Veuillez réessayer.");
      }
    }
    if (messageParam === 'registration_success') {
      setInfoMessage("Compte professeur créé ! Veuillez vous connecter avec vos identifiants.");
    }
  }, [errorParam, messageParam]);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const { role, validationStatus } = session.user;
      let targetUrl = '/';

      if (role === 'PROFESSEUR') {
        targetUrl = '/teacher/dashboard';
      } else if (role === 'ELEVE') {
        targetUrl = validationStatus === 'PENDING' ? '/student/validation-pending' : '/student/dashboard';
      }
      
      router.push(targetUrl);
    }
  }, [status, session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfoMessage(null);

    const result = await signIn('credentials', {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });

    if (result?.ok) {
      // ✅ Forcer le rafraîchissement des données de session côté client
      router.refresh(); 
    } else {
       setError(result?.error === 'CredentialsSignin' ? 'Email ou mot de passe incorrect.' : 'Une erreur est survenue.');
       setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setLoading(true);
    signIn('google');
  };

  // ... (le reste du JSX reste similaire)
}
```

---

## 4. Types d'Authentification (`src/types/next-auth.d.ts`)

Ce fichier étend les types de `next-auth` pour inclure nos champs personnalisés. Il est crucial pour que TypeScript reconnaisse `role`, `validationStatus`, etc., sur l'objet `session.user`.

```typescript
// src/types/next-auth.d.ts
import NextAuth, { DefaultSession } from "next-auth";
import { JWT as NextAuthJWT } from "next-auth/jwt";
import { Role, ValidationStatus } from '@prisma/client';

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: Role;
      classeId?: string | null;
      validationStatus?: ValidationStatus; // ✅ ajouté
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
    classeId?: string | null;
    image?: string | null;
    validationStatus?: ValidationStatus; // ✅ ajouté
  }
}

declare module "next-auth/jwt" {
  interface JWT extends NextAuthJWT {
    id?: string;
    role?: Role;
    classeId?: string | null;
    image?: string | null;
    validationStatus?: ValidationStatus; // ✅ ajouté
  }
}
```