
// src/app/register/page.tsx
import { Suspense } from 'react';
import RegisterForm from './register-form';

// Forcer le rendu dynamique pour éviter les problèmes de cache
export const dynamic = 'force-dynamic';

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
