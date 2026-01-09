
// src/app/teacher/future-classroom/page.tsx
import { getAuthSession } from "@/lib/auth";
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Rocket, Construction } from 'lucide-react';
import { BackButton } from '@/components/BackButton';

export default async function FutureClassroomPage() {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== 'PROFESSEUR') {
    redirect('/login');
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-w-0">
      <div className="flex items-center gap-4 mb-8">
        <BackButton />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Classe du Futur</h1>
          <p className="text-muted-foreground">
            Explorez les outils pédagogiques de demain.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center py-20">
        <Card className="max-w-2xl w-full text-center shadow-lg">
          <CardHeader>
            <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
              <Rocket className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="mt-4 text-2xl">Bientôt Disponible !</CardTitle>
            <CardDescription>
              Nous construisons la prochaine génération d'outils d'apprentissage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-4 text-muted-foreground">
                <Construction className="h-5 w-5" />
                <p>Cette section est actuellement en cours de développement.</p>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
                Revenez bientôt pour découvrir des fonctionnalités innovantes comme l'analyse émotionnelle en temps réel, les scénarios en réalité virtuelle et le neurofeedback pour optimiser l'apprentissage.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
