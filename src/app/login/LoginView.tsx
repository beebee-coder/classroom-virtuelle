// src/app/login/LoginView.tsx
'use client';

import { Suspense } from 'react';
import { School, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LoginForm } from '@/components/LoginForm';

// This is a new client component to encapsulate the view logic.
export function LoginView() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4 relative">
      <div className="absolute top-4 left-4">
        <Button variant="ghost" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à l'accueil
          </Link>
        </Button>
      </div>

      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="flex justify-center items-center gap-3 mb-2">
            <School className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">
              Classroom Connector
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Connectez-vous pour commencer votre session d'apprentissage.
          </p>
        </div>
        
        {/* The Suspense boundary wraps the client component that uses searchParams. */}
        <Suspense fallback={<div className="text-center">Chargement...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
