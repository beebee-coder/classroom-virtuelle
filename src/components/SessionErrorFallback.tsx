// src/components/SessionErrorFallback.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface SessionErrorFallbackProps {
  sessionId: string;
  error?: string;
}

export function SessionErrorFallback({ sessionId, error }: SessionErrorFallbackProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const handleBackToDashboard = () => {
    const dashboardUrl = session?.user?.role === 'PROFESSEUR' ? '/teacher/dashboard' : '/student/dashboard';
    router.push(dashboardUrl);
  };
  
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center p-8 max-w-md bg-card border rounded-lg shadow-lg">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <span className="text-2xl text-destructive">⚠️</span>
        </div>
        <h2 className="text-xl font-bold text-card-foreground mb-2">Erreur de Session</h2>
        <p className="text-muted-foreground mb-4 text-sm">
          {error || 'Impossible de charger la session. Veuillez vérifier votre connexion et réessayer.'}
        </p>
        <div className="space-y-3">
          <button
            onClick={handleRetry}
            className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 transition-colors"
          >
            Réessayer
          </button>
          <button
            onClick={handleBackToDashboard}
            className="w-full bg-muted text-muted-foreground py-2 px-4 rounded-md hover:bg-muted/80 transition-colors"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    </div>
  );
}
