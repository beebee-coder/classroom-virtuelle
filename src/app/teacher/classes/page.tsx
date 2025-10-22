// src/app/teacher/classes/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';
import Link from 'next/link';
import { getAuthSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { BackButton } from '@/components/BackButton';
import { AddClassForm } from '@/components/AddClassForm';

// DUMMY DATA
const dummyClassrooms = [
  { id: 'classe-a', nom: 'Classe 6ème A', _count: { eleves: 10 } },
  { id: 'classe-b', nom: 'Classe 6ème B', _count: { eleves: 10 } },
  { id: 'classe-c', nom: 'Classe 5ème A', _count: { eleves: 10 } },
];


export default async function TeacherClassesPage() {
  const session = await getAuthSession();
  
  if (!session?.user || session.user.role !== 'PROFESSEUR') {
      redirect('/login');
  }
  const user = session.user;

  // Fetch teacher data and classes - USING DUMMY DATA
  const classrooms = dummyClassrooms;

  return (
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-4">
                <BackButton />
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Mes Classes</h1>
                    <p className="text-muted-foreground">
                        {classrooms.length} classe(s) active(s). Cliquez sur une classe pour la gérer.
                    </p>
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
                      <CardDescription>{classroom._count.eleves} élèves</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Accéder à la liste des élèves, gérer les annonces et démarrer une session.</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
      
    </main>
  );
}
