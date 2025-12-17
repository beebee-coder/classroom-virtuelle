// src/app/login/page.tsx
import { Suspense } from 'react';
import LoginForm from './login-form';

// Ce composant est maintenant un "Server Component" par défaut.
// C'est la bonne pratique dans l'App Router.
export default function LoginPage() {
  return (
    // Le Suspense est utile ici pour afficher un chargement
    // pendant que le composant client LoginForm est préparé.
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
