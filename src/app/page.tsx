// src/app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { ArrowRight, School, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { ValidationStatus } from '@prisma/client';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    console.log(`[HOME_PAGE] 🔵 Statut de session: ${status}`);
    if (status === 'authenticated') {
      const user = session?.user;
      console.log(`[HOME_PAGE] 🔵 Utilisateur authentifié: ${user?.email}, Rôle: ${user?.role}, Statut validation: ${user?.validationStatus}, isNewUser: ${user?.isNewUser}, classeId: ${user?.classeId}`);
      
      let targetUrl = '/';
      if (user?.role === 'PROFESSEUR') {
        targetUrl = '/teacher/dashboard';
      } else if (user?.role === 'ELEVE') {
        // CORRECTION : Gestion complète du flux élève
        // 1. Si pas de classeId (nouvel utilisateur) → onboarding
        // 2. Si classeId mais validation en attente → validation-pending
        // 3. Si validé → dashboard
        
        // Méthode 1: Vérifier isNewUser si disponible
        if (user.isNewUser === true || !user.classeId) {
          targetUrl = '/student/onboarding';
        } 
        // Méthode 2: Vérifier validationStatus
        else if (user.validationStatus === ValidationStatus.VALIDATED) {
          targetUrl = '/student/dashboard';
        } else {
          targetUrl = '/student/validation-pending';
        }
      }
      console.log(`[HOME_PAGE] ➡️ Redirection vers: ${targetUrl}`);
      router.push(targetUrl);
    }
  }, [status, session, router]);

  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Chargement de votre session...</p>
      </div>
    );
  }
  
  return (
    <div id="home-container" className="flex flex-col min-h-screen overflow-hidden">
      <div className="fixed inset-0 overflow-hidden -z-10">
        <Image
          src="https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=3024&auto=format&fit=crop"
          alt=""
          aria-hidden="true"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/60 to-background/80" />
      </div>
      
      <main className="flex-1 relative" role="main">
        <div className="container mx-auto px-4 py-20 sm:py-28">
          <div className="flex flex-col items-center justify-center">
            <div className="text-center max-w-2xl">
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-primary flex flex-col sm:flex-row items-center justify-center gap-4">
                <School className="h-10 w-10 sm:h-12 sm:w-12" aria-hidden="true" />
                Classroom Connector
              </h1>
              <p className="mt-8 text-lg text-foreground/90 leading-relaxed">
                Une plateforme innovante pour connecter professeurs et élèves, personnaliser l'apprentissage et explorer des futurs passionnants.
              </p>
              <div className="mt-10">
                <Button size="lg" asChild className="shadow-lg shadow-primary/20 font-medium">
                  <Link href="/login">
                    Accéder à la plateforme <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}