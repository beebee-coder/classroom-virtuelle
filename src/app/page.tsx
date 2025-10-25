// src/app/page.tsx
'use client';

import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { ArrowRight, School } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';

export default function HomePage() {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScale(prevScale => {
        const newScale = prevScale - e.deltaY * 0.001;
        // Limiter le zoom entre 1 (initial) et 1.2 (maximum)
        return Math.max(1, Math.min(newScale, 1.2));
      });
    };

    // Le conteneur principal écoute l'événement de la molette.
    const container = document.getElementById('home-container');
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
    };
  }, []);
  
  return (
    <div id="home-container" className="flex flex-col min-h-screen overflow-hidden">
       {/* Conteneur pour l'image avec overflow-hidden pour contraindre le zoom */}
       <div className="fixed inset-0 overflow-hidden -z-10">
          <Image
            src="https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=3024&auto=format&fit=crop"
            alt="Une salle de classe ensoleillée avec des bureaux et des chaises pour enfants"
            fill
            sizes="100vw"
            className="object-cover transition-transform duration-300 ease-out"
            style={{ transform: `scale(${scale})` }}
            priority
          />
       </div>
       <div className="absolute inset-0 bg-background/60 backdrop-blur-sm -z-10" />

      {/* Utilisation de null car c'est une page publique, la session est gérée dans le redirect sur la version serveur */}
      <Header user={null} />
      <main className="flex-1 relative">
        <div className="container mx-auto px-4 py-16 sm:py-24">
          <div className="flex flex-col items-center justify-center">
            
            {/* Hero Section */}
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
