// src/app/teacher/dashboard/TeacherDashboardClient.tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CheckCircle, Megaphone } from 'lucide-react';
import Link from 'next/link';
import { CreateAnnouncementForm } from '@/components/CreateAnnouncementForm';
import type { Session } from 'next-auth';
import { useEffect, useRef } from 'react';

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
  const hasLoggedRef = useRef(false);
  useEffect(() => {
    if (!hasLoggedRef.current) {
      console.log('👨‍🏫 [DASHBOARD CLIENT] Rendu du tableau de bord avec:', {
        user: user?.name,
        classroomsCount: classrooms.length,
        validationCount
      });
      hasLoggedRef.current = true;
    }
  }, [user?.name, classrooms.length, validationCount]);

  return (
    <>
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
            Tableau de bord du professeur
          </h1>
          <p className="text-muted-foreground truncate">
            Bienvenue, {user?.name || 'Professeur'}. Voici un aperçu de votre journée.
          </p>
        </div>
      </div>
      
      {/* Grille des cartes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Carte: Gérer les classes */}
        <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 h-full border-2 border-transparent hover:border-primary/20 min-w-0">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-3 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors flex-shrink-0">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg truncate">Gérer les Classes</CardTitle>
                <CardDescription className="mt-1 truncate">
                  {classrooms.length > 0 
                    ? `${classrooms.length} classe(s) active(s)`
                    : "Aucune classe créée"
                  }
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col">
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              Accédez à vos listes d'élèves, démarrez des sessions et suivez leur progression.
            </p>
            <Link 
              href="/teacher/classes" 
              className="inline-flex items-center text-sm font-medium text-primary hover:underline mt-auto"
              aria-label="Gérer les classes"
            >
              Voir les classes
            </Link>
          </CardContent>
        </Card>

        {/* Carte: Validations en attente */}
        <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 h-full border-2 border-transparent hover:border-primary/20 min-w-0">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-3 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg truncate">Validations</CardTitle>
                <CardDescription className="mt-1 truncate">
                  {validationCount > 0 ? (
                    <span className="text-red-500 font-semibold [
                      @media (prefers-reduced-motion: no-preference) {
                        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                      }
                    ]">
                      {validationCount} tâche(s) à valider
                    </span>
                  ) : (
                    "Aucune tâche à valider"
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col">
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              Examinez les soumissions de vos élèves et attribuez-leur des points.
            </p>
            <Link 
              href="/teacher/validations" 
              className="inline-flex items-center text-sm font-medium text-primary hover:underline mt-auto"
              aria-label="Voir les validations en attente"
            >
              Voir les validations
            </Link>
          </CardContent>
        </Card>

        {/* Carte: Créer une annonce */}
        <Card className="transition-all duration-300 h-full flex flex-col border-2 border-transparent hover:border-primary/20 min-w-0">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-3 bg-primary/10 rounded-full flex-shrink-0">
                <Megaphone className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg truncate">Créer une Annonce</CardTitle>
                <CardDescription className="mt-1 truncate">
                  Communiquez avec vos classes
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-grow min-w-0">
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
          <h2 className="text-2xl font-bold mb-6 truncate">Vue d'ensemble</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="min-w-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground truncate">
                  Total des Classes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{classrooms.length}</div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  Classes actives
                </p>
              </CardContent>
            </Card>
            
            <Card className="min-w-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground truncate">
                  Validations en Attente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{validationCount}</div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  Tâches à examiner
                </p>
              </CardContent>
            </Card>
            
            <Card className="min-w-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground truncate">
                  Actions Rapides
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 min-w-0">
                  <Link 
                    href="/teacher/tasks" 
                    className="block text-sm text-primary hover:underline truncate"
                  >
                    Gérer les tâches
                  </Link>
                  <Link 
                    href="/teacher/profile" 
                    className="block text-sm text-primary hover:underline truncate"
                  >
                    Modifier le profil
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}