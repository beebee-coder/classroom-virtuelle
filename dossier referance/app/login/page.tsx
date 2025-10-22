// src/app/login/page.tsx
import { Suspense } from 'react';
import { School, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LoginForm } from '@/components/LoginForm';

// This is the main server component for the page.
export default async function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 relative">
      <Button variant="outline" asChild className="absolute top-4 left-4">
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Link>
      </Button>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="flex justify-center items-center gap-2 mb-4 text-primary hover:opacity-80 transition-opacity">
            <School className="h-10 w-10" />
            <h1 className="text-4xl font-extrabold tracking-tight">
              Classroom Connector
            </h1>
          </Link>
          <p className="text-lg text-muted-foreground">
            Connectez-vous pour commencer.
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
