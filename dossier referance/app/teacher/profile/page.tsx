// src/app/teacher/profile/page.tsx
import { Header } from "@/components/Header";
import { Sidebar, SidebarContent, SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import Menu from "@/components/Menu";
import { getAuthSession } from "@/lib/session";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { BackButton } from "@/components/BackButton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Book, Video, Clock } from "lucide-react";
import { ProfileAvatar } from "@/components/ProfileAvatar";


export default async function TeacherProfilePage() {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== 'PROFESSEUR') {
      redirect('/login');
  }

  const user = session.user;

  const teacherData = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      classesEnseignees: {
        include: {
          _count: {
            select: { eleves: true },
          },
        },
      },
    },
  });

  const classrooms = teacherData?.classesEnseignees || [];
  const totalStudents = classrooms.reduce((acc, curr) => acc + (curr as any)._count.eleves, 0);

  return (
    <SidebarProvider>
      <div className="flex flex-col min-h-screen">
        <Header user={user}>
          <SidebarTrigger />
        </Header>
        <div className="flex flex-1">
          <Sidebar>
            <SidebarContent>
              <Menu user={user} classrooms={classrooms} />
            </SidebarContent>
          </Sidebar>
          <SidebarInset>
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="flex items-center gap-4 mb-8">
                <BackButton />
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Profil du Professeur</h1>
                  <p className="text-muted-foreground">Vos informations et statistiques.</p>
                </div>
              </div>

              <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-1">
                  <CardHeader>
                     <div className="flex flex-col items-center gap-4">
                        <ProfileAvatar user={user} isInteractive={true} className="h-24 w-24 text-4xl" />
                        <div>
                            <CardTitle className="text-3xl text-center">{user.name}</CardTitle>
                            <CardDescription className="text-center">{user.email}</CardDescription>
                        </div>
                    </div>
                  </CardHeader>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Statistiques</CardTitle>
                        <CardDescription>Aperçu de votre activité sur la plateforme.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex items-center p-4 bg-muted rounded-lg">
                                <div className="p-3 bg-primary/10 rounded-full mr-4">
                                    <Book className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{classrooms.length}</p>
                                    <p className="text-sm text-muted-foreground">Classe(s) Gérée(s)</p>
                                </div>
                            </div>
                             <div className="flex items-center p-4 bg-muted rounded-lg">
                                <div className="p-3 bg-primary/10 rounded-full mr-4">
                                    <Users className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{totalStudents}</p>
                                    <p className="text-sm text-muted-foreground">Élève(s) au total</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                 <Card>
                    <CardHeader>
                        <CardTitle>Rapport de Session</CardTitle>
                        <CardDescription>Analyse de vos sessions d'enseignement.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex items-center p-4 bg-muted rounded-lg">
                                <div className="p-3 bg-blue-500/10 rounded-full mr-4">
                                    <Video className="h-6 w-6 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">12</p>
                                    <p className="text-sm text-muted-foreground">Sessions totales</p>
                                </div>
                            </div>
                             <div className="flex items-center p-4 bg-muted rounded-lg">
                                <div className="p-3 bg-green-500/10 rounded-full mr-4">
                                    <Clock className="h-6 w-6 text-green-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">28m</p>
                                    <p className="text-sm text-muted-foreground">Durée moyenne</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
              </div>
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
