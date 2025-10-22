// src/app/page.tsx
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAuthSession } from '@/lib/session';
import { ArrowRight, BookOpen, UserCheck, Megaphone } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getPublicAnnouncements } from '@/lib/actions/announcement.actions';
import { format } from 'date-fns';
import { AnnouncementWithAuthor } from '@/lib/types';
import { Sidebar, SidebarContent, SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import Menu from '@/components/Menu';

export default async function HomePage() {
  const session = await getAuthSession();
  const announcements = await getPublicAnnouncements(3);

  // Redirect logged-in users to their respective dashboards
  if (session?.user) {
    if (session.user.role === 'PROFESSEUR') {
      redirect('/teacher');
    } else if (session.user.role === 'ELEVE') {
      redirect(`/student/${session.user.id}`);
    }
  }

  // Render homepage content for non-logged-in users
  return (
    <SidebarProvider>
      <div className="flex flex-col min-h-screen">
        <Header user={null}>
          <SidebarTrigger />
        </Header>
        <div className="flex flex-1">
          <Sidebar>
            <SidebarContent>
              {/* Le menu peut être conditionnel ou différent pour les visiteurs */}
               <div className="p-4">
                <h2 className="font-semibold text-lg mb-4">Fonctionnalités Clés</h2>
                <div className="space-y-4">
                  <Card>
                    <CardHeader className='p-4'>
                      <CardTitle className='text-base flex items-center gap-2'><UserCheck className="h-5 w-5 text-primary" />Tableaux de Bord</CardTitle>
                    </CardHeader>
                    <CardContent className='p-4 text-sm'>
                      <p>Des interfaces optimisées pour les professeurs et les élèves.</p>
                    </CardContent>
                  </Card>
                   <Card>
                    <CardHeader className='p-4'>
                      <CardTitle className='text-base flex items-center gap-2'><BookOpen className="h-5 w-5 text-primary" />Librairie de Métiers</CardTitle>
                    </CardHeader>
                    <CardContent className='p-4 text-sm'>
                      <p>Un catalogue de carrières pour inspirer les élèves.</p>
                    </CardContent>
                  </Card>
                   <Card>
                    <CardHeader className='p-4'>
                       <CardTitle className='text-base flex items-center gap-2'><ArrowRight className="h-5 w-5 text-primary" />Sessions Interactives</CardTitle>
                    </CardHeader>
                    <CardContent className='p-4 text-sm'>
                      <p>Lancez des sessions vidéo en direct avec vos élèves.</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </SidebarContent>
          </Sidebar>
          <SidebarInset>
             <main className="flex-grow">
              {/* Hero Section */}
              <section className="container mx-auto px-4 py-20 sm:py-32 text-center">
                <h1 className="text-4xl font-extrabold tracking-tight lg:text-6xl text-primary">
                  Classroom Connector
                </h1>
                <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground">
                  Une plateforme innovante pour connecter professeurs et élèves, personnaliser l'apprentissage et explorer des futurs passionnants.
                </p>
                <div className="mt-8 flex justify-center gap-4">
                  <Button size="lg" asChild>
                    <Link href="/login">
                      Accéder à la plateforme <ArrowRight className="ml-2" />
                    </Link>
                  </Button>
                </div>
              </section>

              {/* Announcements Section */}
              {announcements.length > 0 && (
                <section className="py-20 bg-muted/50">
                  <div className="container mx-auto px-4">
                    <h2 className="text-3xl font-bold text-center mb-12">Annonces Récentes</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {announcements.map((announcement: AnnouncementWithAuthor) => (
                        <Card key={announcement.id}>
                          <CardHeader>
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-primary/10 rounded-full">
                                <Megaphone className="h-6 w-6 text-primary" />
                              </div>
                              <CardTitle>{announcement.title}</CardTitle>
                            </div>
                            <CardDescription>
                              <p>Par {announcement.author.name ?? 'Utilisateur inconnu'} - {format(new Date(announcement.createdAt), 'dd MMMM yyyy')}</p>
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <p>{announcement.content}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </section>
              )}
             </main>
              <footer className="py-6 border-t">
                <div className="container mx-auto px-4 text-center text-muted-foreground">
                  <p>&copy; {new Date().getFullYear()} Classroom Connector. Tous droits réservés.</p>
                </div>
              </footer>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
