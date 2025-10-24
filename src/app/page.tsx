// src/app/page.tsx
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Megaphone, Users } from 'lucide-react';
import Link from 'next/link';
import { getPublicAnnouncements, type AnnouncementWithAuthor } from '@/lib/actions/announcement.actions';
import { format } from 'date-fns';
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
  const announcements: AnnouncementWithAuthor[] = await getPublicAnnouncements(2);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/40">
      <Header user={null} />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-16 sm:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Hero Section */}
            <div className="text-center lg:text-left">
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-primary">
                Classroom Connector
              </h1>
              <p className="mt-6 max-w-xl mx-auto lg:mx-0 text-lg text-muted-foreground">
                Une plateforme innovante pour connecter professeurs et élèves, personnaliser l'apprentissage et explorer des futurs passionnants.
              </p>
              <div className="mt-10 flex justify-center lg:justify-start">
                <Button size="lg" asChild className="shadow-lg shadow-primary/20">
                  <Link href="/login">
                    Accéder à la plateforme <ArrowRight className="ml-2" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Announcements Section */}
            <div className="space-y-6">
               <h2 className="text-3xl font-bold text-center mb-8">Annonces Récentes</h2>
                {announcements.length > 0 ? (
                    announcements.map((announcement: AnnouncementWithAuthor) => (
                      <Card key={announcement.id} className="transition-shadow hover:shadow-lg">
                        <CardHeader>
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-full">
                              <Megaphone className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">{announcement.title}</CardTitle>
                                <CardDescription>
                                    Par {announcement.author.name ?? 'Utilisateur inconnu'} - {format(new Date(announcement.createdAt), 'dd MMM yyyy')}
                                </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">{announcement.content}</p>
                        </CardContent>
                      </Card>
                    ))
                ) : (
                    <p className="text-muted-foreground text-center py-8">Aucune annonce pour le moment.</p>
                )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
