// src/app/librairie-metiers/page.tsx
import { getAuthSession } from "@/lib/auth";
import { redirect } from 'next/navigation';
import { getMetiers } from '@/lib/actions/teacher.actions'; // Action pour récupérer les métiers
import { Header } from "@/components/Header";
import { BackButton } from "@/components/BackButton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import * as LucideIcons from 'lucide-react';

export const dynamic = 'force-dynamic';

const getIcon = (iconName: string | null) => {
    if (!iconName) return BookOpen;
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent || BookOpen;
};

export default async function CareerLibraryPage() {
  const session = await getAuthSession();

  if (!session?.user || session.user.role !== 'PROFESSEUR') {
    redirect('/login');
  }

  const metiers = await getMetiers(); // Appel de la nouvelle action

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <BackButton />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Librairie des Métiers</h1>
            <p className="text-muted-foreground">
              Explorez tous les métiers disponibles dans l'application.
            </p>
          </div>
        </div>

        {metiers.length === 0 ? (
          <Card className="text-center p-8">
            <CardHeader>
              <CardTitle>Aucun métier trouvé</CardTitle>
              <CardDescription>
                La base de données des métiers est actuellement vide.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {metiers.map(metier => {
              const Icon = getIcon(metier.icon);
              return (
                <Card key={metier.id} className="flex flex-col">
                  <CardHeader className="flex-row items-center gap-4 space-y-0 pb-4">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>{metier.nom}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <CardDescription>{metier.description}</CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
