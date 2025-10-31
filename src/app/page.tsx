// src/app/page.tsx
'use client';

import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { ArrowRight, School, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Rediriger les utilisateurs authentifiés vers leur dashboard
    if (status === 'authenticated' && session?.user) {
      console.log('🔵 [HOMEPAGE] - Utilisateur authentifié, redirection vers dashboard');
      const targetUrl = session.user.role === 'PROFESSEUR' ? '/teacher/dashboard' : '/student/dashboard';
      router.push(targetUrl);
    }
  }, [session, status, router]);

  // Afficher un loader pendant la vérification de l'authentification ou si la redirection est en cours
  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Chargement de votre session...</p>
      </div>
    );
  }
  
  return (
    <div id="home-container" className="flex flex-col min-h-screen overflow-hidden">
       <div className="fixed inset-0 overflow-hidden -z-10">
          <Image
            src="https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=3024&auto=format&fit=crop"
            alt="Une salle de classe ensoleillée avec des bureaux et des chaises pour enfants"
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
       </div>
       <div className="absolute inset-0 bg-background/60 backdrop-blur-sm -z-10" />

      <Header user={null} />
      <main className="flex-1 relative">
        <div className="container mx-auto px-4 py-16 sm:py-24">
          <div className="flex flex-col items-center justify-center">
            
            <div className="text-center">
               <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-primary flex items-center justify-center gap-4">
                 <School className="h-10 w-10 sm:h-12 sm:w-12" />
                Classroom Connector
              </h1>
              <p className="mt-6 max-w-xl mx-auto text-lg text-foreground/80">
                Une plateforme innovante pour connecter professeurs et élèves, personnaliser l'apprentissage et explorer des futurs passionnants.
              </p>
              <div className="mt-10 flex justify-center">
                <Button size="lg" asChild className="shadow-lg shadow-primary/20">
                  <Link href="/login">
                    Accéder à la plateforme <ArrowRight className="ml-2" />
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
