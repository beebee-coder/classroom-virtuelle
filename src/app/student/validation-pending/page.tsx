// src/app/student/validation-pending/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Hourglass, UserCheck, Loader2 } from "lucide-react";
import Link from "next/link";

export default function ValidationPendingPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      if (session.user.validationStatus === 'VALIDATED') {
        router.push('/student/dashboard');
        return;
      }
      
      const interval = setInterval(async () => {
        // Force une mise à jour de la session pour récupérer le nouveau statut
        await update();
      }, 5000); // Vérifie toutes les 5 secondes

      return () => clearInterval(interval);
    }
  }, [status, session, router, update]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  if (!session || session.user.role !== 'ELEVE' || session.user.validationStatus === 'VALIDATED') {
    // Redirection si l'état est incohérent (déjà validé, pas un élève, etc.)
    router.push('/');
    return null;
  }
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <Card className="bg-card/80 backdrop-blur-sm border-white/20 shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-orange-100 rounded-full">
              <Hourglass className="h-8 w-8 text-orange-600 animate-pulse" />
            </div>
            <CardTitle className="text-2xl font-bold">Validation en cours</CardTitle>
            <CardDescription className="text-muted-foreground">
              Votre compte est en attente de validation par votre enseignant.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              La page se rafraîchira automatiquement dès que votre compte sera approuvé.
            </p>
            <div className="bg-muted/50 p-3 rounded-md">
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                <UserCheck className="h-4 w-4" />
                Compte : <span className="font-mono">{session.user.email}</span>
              </p>
            </div>
            <Link
              href="/"
              className="inline-block mt-2 text-sm text-primary hover:underline"
            >
              ← Retour à l'accueil
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}