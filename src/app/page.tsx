// src/app/page.tsx
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Megaphone, Users } from 'lucide-react';
import Link from 'next/link';
import { getPublicAnnouncements, type AnnouncementWithAuthor } from '@/lib/actions/announcement.actions';
import { getAuthSession } from '@/lib/session';
import { redirect } from 'next/navigation';

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
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/40">
      <Header user={null} />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-16 sm:py-24">
          <div className="flex flex-col items-center justify-center">
            
            {/* Hero Section */}
            <div className="text-center">
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-primary">
                Classroom Connector
              </h1>
              <p className="mt-6 max-w-xl mx-auto text-lg text-muted-foreground">
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
