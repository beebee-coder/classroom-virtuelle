// src/app/student/validation-pending/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Hourglass, UserCheck, Loader2 } from "lucide-react";
import Link from "next/link";
import { ValidationStatus } from '@prisma/client';

export default function ValidationPendingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // Si l'utilisateur est déjà validé lors du chargement initial de la session
    if (status === 'authenticated' && session.user.validationStatus === ValidationStatus.VALIDATED) {
      router.push('/student/dashboard');
      return;
    }

    // Met en place une vérification périodique
    const interval = setInterval(async () => {
      if (document.hidden || isChecking) return; // Ne pas vérifier si l'onglet est inactif ou si une vérification est déjà en cours

      setIsChecking(true);
      try {
        const res = await fetch('/api/auth/status');
        if (res.ok) {
          const data = await res.json();
          if (data.validationStatus === ValidationStatus.VALIDATED) {
            // Statut mis à jour ! Arrêter l'intervalle et rediriger.
            clearInterval(interval);
            router.push('/student/dashboard');
          }
        }
      } catch (error) {
        console.error("Erreur lors de la vérification du statut:", error);
      } finally {
        setIsChecking(false);
      }
    }, 5000); // Vérifie toutes les 5 secondes

    return () => clearInterval(interval); // Nettoie l'intervalle lors du démontage du composant

  }, [status, session, router, isChecking]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  if (!session || session.user.role !== 'ELEVE') {
    // Redirection si l'état est incohérent (pas un élève, etc.)
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
