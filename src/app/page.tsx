// src/app/page.tsx
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Megaphone, Users } from 'lucide-react';
import Link from 'next/link';
import { getPublicAnnouncements, type AnnouncementWithAuthor } from '@/lib/actions/announcement.actions';
import { format } from 'date-fns';
import { Sidebar, SidebarContent, SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
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
    <SidebarProvider>
      <div className="flex flex-col h-screen ">
        <Header user={null}>
          <SidebarTrigger />
        </Header>
        <div className="flex flex-1 overflow-hidden ">
          <Sidebar>
            <SidebarContent>
               <div className="p-4 ">
                <h2 className="font-semibold text-lg mb-4 text-center">Au Cœur des Sessions</h2>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users className="text-primary"/> Nos Élèves</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Découvrez un environnement d'apprentissage dynamique et interactif où chaque élève peut s'épanouir.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </SidebarContent>
          </Sidebar>
          <SidebarInset>
             <main className="flex-1 flex items-center justify-center bg-gray-200 p-1  min-h-screen
              ">
              <Card className="w-full max-w-28xl h-full   ">
                <CardContent className="p-8">
                  <div className="container mx-auto  grid grid-cols-1 lg:grid-cols-2 gap-12 items-center  mt-20">
                    
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
                       <h2 className="text-3xl font-bold text-center ">Annonces Récentes</h2>
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
