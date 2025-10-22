// src/app/page.tsx
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAuthSession } from '@/lib/session';
import { ArrowRight, Megaphone } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getPublicAnnouncements } from '@/lib/actions/announcement.actions';
import { format } from 'date-fns';
import { AnnouncementWithAuthor } from '@/lib/types';
import { Sidebar, SidebarContent, SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { StudentCarousel } from '@/components/StudentCarousel'; // Importer le nouveau composant

export default async function HomePage() {
  console.log('🏠 [PAGE] - Chargement de la page d\'accueil.');

  // ---=== BYPASS BACKEND ===---
  // const session = await getAuthSession();
  const session = null; // Simule un utilisateur non connecté pour afficher la page publique
  console.log('👤 [BYPASS] Session simulée (visiteur) :', session);
  // ---=========================---
  
  const announcements = await getPublicAnnouncements(2); // Limiter à 2 pour l'espace

  // Redirect logged-in users to their respective dashboards
  if (session?.user) {
    console.log('👤 [PAGE] - Session utilisateur trouvée:', JSON.stringify(session.user, null, 2));
    if (session.user.role === 'PROFESSEUR') {
      console.log('Redirecting to /teacher/dashboard');
      redirect('/teacher/dashboard');
    } else if (session.user.role === 'ELEVE') {
      console.log('Redirecting to /student/dashboard');
      redirect(`/student/dashboard`);
    } else {
       console.warn('🤷 [PAGE] - Rôle non reconnu, pas de redirection:', session.user.role);
    }
  } else {
    console.log('✅ [PAGE] - Affichage de la page d\'accueil pour visiteur.');
  }

  // Render homepage content for non-logged-in users
  return (
    <SidebarProvider>
      <div className="flex flex-col h-screen">
        <Header user={null}>
          <SidebarTrigger />
        </Header>
        <div className="flex flex-1 overflow-hidden">
          <Sidebar>
            <SidebarContent>
              {/* Remplacer les cartes statiques par le carrousel dynamique */}
               <div className="p-4">
                <h2 className="font-semibold text-lg mb-4 text-center">Au Cœur des Sessions</h2>
                <StudentCarousel />
              </div>
            </SidebarContent>
          </Sidebar>
          <SidebarInset>
             <main className="flex-1 flex items-center justify-center p-4 lg:p-8">
              <Card className="w-full max-w-6xl">
                <CardContent className="p-8">
                  <div className="container mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    
                    {/* Hero Section */}
                    <div className="text-center lg:text-left">
                      <h1 className="text-4xl font-extrabold tracking-tight lg:text-6xl text-primary">
                        Classroom Connector
                      </h1>
                      <p className="mt-6 max-w-xl mx-auto lg:mx-0 text-lg text-muted-foreground">
                        Une plateforme innovante pour connecter professeurs et élèves, personnaliser l'apprentissage et explorer des futurs passionnants.
                      </p>
                      <div className="mt-8 flex justify-center lg:justify-start">
                        <Button size="lg" asChild>
                          <Link href="/login">
                            Accéder à la plateforme <ArrowRight className="ml-2" />
                          </Link>
                        </Button>
                      </div>
                    </div>

                    {/* Announcements Section */}
                    <div className="space-y-6">
                       <h2 className="text-3xl font-bold text-center lg:text-left">Annonces Récentes</h2>
                        {announcements.length > 0 ? (
                            announcements.map((announcement: AnnouncementWithAuthor) => (
                              <Card key={announcement.id}>
                                <CardHeader>
                                  <div className="flex items-center gap-4">
                                    <div className="p-3 bg-primary/10 rounded-full">
                                      <Megaphone className="h-6 w-6 text-primary" />
                                    </div>
                                    <CardTitle className="text-lg">{announcement.title}</CardTitle>
                                  </div>
                                  <CardDescription>
                                    <p>Par {announcement.author.name ?? 'Utilisateur inconnu'} - {format(new Date(announcement.createdAt), 'dd MMM yyyy')}</p>
                                  </CardDescription>
                                </CardHeader>
                                <CardContent>
                                  <p className="text-sm">{announcement.content}</p>
                                </CardContent>
                              </Card>
                            ))
                        ) : (
                            <p className="text-muted-foreground">Aucune annonce pour le moment.</p>
                        )}
                    </div>

                  </div>
                </CardContent>
              </Card>
             </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
