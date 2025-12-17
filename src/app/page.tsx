// src/app/page.tsx
import { Button } from '@/components/ui/button';
import { ArrowRight, School } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from '@/components/ThemeToggle';

// En-tête simplifié et autonome pour la page d'accueil statique
function StaticHeader() {
  return (
    <header className="bg-card/80 backdrop-blur-sm border-b shadow-sm sticky top-0 z-50">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        <Link
          href="/"
          aria-label="Accueil"
          className="flex items-center gap-2 font-bold text-lg text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
        >
          <School className="h-6 w-6" aria-hidden="true" />
          <span>Classroom Connector</span>
        </Link>
        <nav className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild>
            <Link href="/login">
              Connexion
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}


// Page d'accueil complètement statique pour garantir le rendu.
export default function HomePage() {
  return (
    <div id="home-container" className="flex flex-col min-h-screen overflow-hidden">
      <StaticHeader />
      
      {/* Fond d'image */}
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
      
      {/* Contenu principal */}
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
