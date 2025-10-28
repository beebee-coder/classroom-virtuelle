// src/app/teacher/dashboard/TeacherDashboardClient.tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CheckCircle, Megaphone } from 'lucide-react';
import Link from 'next/link';
import { CreateAnnouncementForm } from '@/components/CreateAnnouncementForm';
import type { Session } from 'next-auth';

interface ClassroomData {
  id: string;
  nom: string;
}

interface TeacherDashboardClientProps {
  user: Session['user'];
  classrooms: ClassroomData[];
  validationCount: number;
}

export default function TeacherDashboardClient({ 
  user, 
  classrooms, 
  validationCount 
}: TeacherDashboardClientProps) {
  
  console.log('👨‍🏫 [DASHBOARD CLIENT] Rendu du tableau de bord avec:', {
    user: user?.name,
    classroomsCount: classrooms.length,
    validationCount
  });

  return (
    <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tableau de bord du professeur</h1>
          <p className="text-muted-foreground">
            Bienvenue, {user?.name || 'Professeur'}. Voici un aperçu de votre journée.
          </p>
        </div>
      </div>
      
      {/* Grille des cartes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Carte: Gérer les classes */}
        <Link href="/teacher/classes" className="group block">
          <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 h-full border-2 border-transparent hover:border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Gérer les Classes</CardTitle>
                  <CardDescription className="mt-1">
                    {classrooms.length > 0 
                      ? `${classrooms.length} classe(s) active(s)`
                      : "Aucune classe créée"
                    }
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Accédez à vos listes d'élèves, démarrez des sessions et suivez leur progression.
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Carte: Validations en attente */}
        <Link href="/teacher/validations" className="group block">
          <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 h-full border-2 border-transparent hover:border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Validations</CardTitle>
                  <CardDescription className="mt-1">
                    {validationCount > 0 ? (
                      <span className="text-red-500 font-semibold animate-pulse">
                        {validationCount} tâche(s) à valider
                      </span>
                    ) : (
                      "Aucune tâche à valider"
                    )}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Examinez les soumissions de vos élèves et attribuez-leur des points.
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Carte: Créer une annonce */}
        <Card className="transition-all duration-300 h-full flex flex-col border-2 border-transparent hover:border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Megaphone className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Créer une Annonce</CardTitle>
                <CardDescription className="mt-1">
                  Communiquez avec vos classes
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-grow">
            <CreateAnnouncementForm 
              classrooms={classrooms.map((c: ClassroomData) => ({ 
                id: c.id, 
                nom: c.nom 
              }))} 
            />
          </CardContent>
        </Card>
      </div>

      {/* Section statistiques supplémentaires */}
      {classrooms.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Vue d'ensemble</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total des Classes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{classrooms.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Classes actives
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Validations en Attente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{validationCount}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Tâches à examiner
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Actions Rapides
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Link 
                    href="/teacher/tasks" 
                    className="block text-sm text-primary hover:underline"
                  >
                    Gérer les tâches
                  </Link>
                  <Link 
                    href="/teacher/profile" 
                    className="block text-sm text-primary hover:underline"
                  >
                    Modifier le profil
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </main>
  );
}