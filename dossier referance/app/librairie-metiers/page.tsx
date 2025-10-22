// src/app/librairie-metiers/page.tsx
import { Header } from '@/components/Header';
import { getAuthSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { BackButton } from '@/components/BackButton';
import { CareerGrid } from './CareerGrid';


export default async function CareersPage() {
  const session = await getAuthSession();
  const careers = await prisma.metier.findMany();
  
  // Si l'utilisateur est un élève, on récupère son métier actuel
  const studentCareerId = session?.user.role === 'ELEVE' 
    ? (await prisma.etatEleve.findUnique({
        where: { eleveId: session.user.id },
        select: { metierId: true }
      }))?.metierId
    : null;

  return (
    <>
      <Header user={session?.user} />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <BackButton />
        </div>
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
            Librairie Métiers
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Explorez les différents environnements et thèmes disponibles pour les élèves. Chaque métier offre une expérience visuelle unique.
          </p>
        </div>

        <CareerGrid 
            careers={careers} 
            isStudent={session?.user.role === 'ELEVE'}
            studentId={session?.user.id}
            currentCareerId={studentCareerId}
        />
      </main>
    </>
  );
}
