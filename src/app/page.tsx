// src/app/page.tsx
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { getAuthSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import Image from 'next/image';

export default async function HomePage() {
  console.log('🏠 [PAGE] - Chargement de la page d\'accueil.');
  const session = await getAuthSession();

  if (session?.user) {
    const targetPath =
      session.user.role === 'PROFESSEUR'
        ? '/teacher/dashboard'
        : '/student/dashboard';
    console.log(`  Utilisateur connecté, redirection vers ${targetPath}`);
    redirect(targetPath);
  }
  
  console.log('✅ [PAGE] - Affichage de la page d\'accueil pour visiteur.');
  
  return (
    <div className="flex flex-col min-h-screen">
       <Image
          src="https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=3024&auto=format&fit=crop"
          alt="Une salle de classe ensoleillée avec des bureaux et des chaises pour enfants"
          fill
          className="object-cover"
          priority
        />
       <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />

      <Header user={null} />
      <main className="flex-1 relative">
        <div className="container mx-auto px-4 py-16 sm:py-24">
          <div className="flex flex-col items-center justify-center">
            
            {/* Hero Section */}
            <div className="text-center">
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-primary">
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
