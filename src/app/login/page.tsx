
// src/app/login/page.tsx - VERSION CORRIGÉE
import { Suspense } from 'react';
import LoginForm from './login-form';

// 🔥 FORCER LE RENDU DYNAMIQUE (CLIENT-SIDE ONLY)
export const dynamic = 'force-dynamic';
export const runtime = 'edge'; // Optionnel, pour meilleures performances

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

    