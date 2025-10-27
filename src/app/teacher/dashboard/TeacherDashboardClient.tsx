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

export default function TeacherDashboardClient({ user, classrooms, validationCount }: TeacherDashboardClientProps) {
    return (
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tableau de bord du professeur</h1>
            <p className="text-muted-foreground">Bienvenue, {user.name}. Voici un aperçu de votre journée.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Gérer les classes */}
          <Link href="/teacher/classes" className="group">
            <Card className="transition-all duration-300 hover:shadow-xl hover:-translate-y-1 h-full">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Gérer les Classes</CardTitle>
                    <CardDescription>
                      {classrooms.length > 0 
                        ? `${classrooms.length} classe(s) active(s)`
                        : "Aucune classe trouvée"
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

          {/* Validations en attente */}
          <Link href="/teacher/validations" className="group">
            <Card className="transition-all duration-300 hover:shadow-xl hover:-translate-y-1 h-full">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <CheckCircle className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Validations</CardTitle>
                    <CardDescription>
                      {validationCount > 0 ? (
                        <span className="text-red-500 font-bold">{validationCount} tâche(s) à valider</span>
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

          {/* Créer une annonce */}
          <Card className="transition-all duration-300 h-full flex flex-col justify-center">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Megaphone className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Créer une Annonce</CardTitle>
                  <CardDescription>Communiquez avec vos classes.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CreateAnnouncementForm 
                classrooms={classrooms.map((c: ClassroomData) => ({ id: c.id, nom: c.nom }))} 
              />
            </CardContent>
          </Card>
        </div>
      </main>
    );
}
