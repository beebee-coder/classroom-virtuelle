
// src/app/teacher/classes/page.tsx
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { getAuthSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { BackButton } from '@/components/BackButton';
import { Sidebar, SidebarContent, SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AddClassForm } from '@/components/AddClassForm';
import Menu from '@/components/Menu'; // Import the new Menu component

export default async function TeacherClassesPage() {
  const session = await getAuthSession();
  
  if (!session?.user || session.user.role !== 'PROFESSEUR') {
      redirect('/login');
  }
  const user = session.user;

  // Fetch teacher data and classes
  const teacher = await prisma.user.findFirst({
    where: { id: user.id, role: 'PROFESSEUR' },
    include: {
      classesEnseignees: {
        include: {
          _count: {
            select: { eleves: true },
          },
        },
        orderBy: {
          nom: 'asc',
        },
      },
    },
  });

  const classrooms = teacher?.classesEnseignees || [];

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
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                    <div className="flex items-center gap-4">
                        <BackButton />
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Mes Classes</h1>
                            <p className="text-muted-foreground">Cliquez sur une classe pour la gérer.</p>
                        </div>
                    </div>
                    <AddClassForm teacherId={user.id} />
                </div>

              {classrooms.length === 0 ? (
                <Card className="text-center p-8">
                  <CardHeader>
                    <CardTitle>Aucune classe trouvée</CardTitle>
                    <CardDescription>Commencez par ajouter votre première classe pour voir vos élèves.</CardDescription>
                  </CardHeader>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {classrooms.map(classroom => (
                    <Link href={`/teacher/class/${classroom.id}`} className="group" key={classroom.id}>
                      <Card className="transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                        <CardHeader>
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-full">
                              <Users className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <CardTitle>{classroom.nom}</CardTitle>
                              <CardDescription>{(classroom as any)._count.eleves} élèves</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">Accéder à la liste des élèves et gérer leurs thèmes.</p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
              
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
