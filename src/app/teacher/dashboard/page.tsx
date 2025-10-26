// src/app/teacher/dashboard/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CheckCircle, Megaphone, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getTasksForProfessorValidation } from '@/lib/actions/teacher.actions';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { CreateAnnouncementForm } from '@/components/CreateAnnouncementForm';

export const dynamic = 'force-dynamic';

// Composant d'erreur pour afficher un état de fallback
function DashboardErrorState({ message, retryAction }: { message: string; retryAction?: () => void }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-destructive/10 rounded-full">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-destructive">Erreur de chargement</CardTitle>
              <CardDescription>{message}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Une erreur est survenue lors du chargement des données. Veuillez réessayer.
          </p>
          {retryAction && (
            <button
              onClick={retryAction}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Réessayer
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Interface pour les données de classe minimales
interface ClassroomData {
  id: string;
  nom: string;
}

export default async function TeacherDashboardPage() {
  console.log('👨‍🏫 [PAGE] - Chargement du tableau de bord professeur.');

  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || session.user.role !== 'PROFESSEUR') {
      console.log('  Redirection vers /login, utilisateur non authentifié ou rôle incorrect.');
      redirect('/login');
    }

    const user = session.user;

    // Fetch des données avec gestion d'erreur
    let classrooms: ClassroomData[] = [];
    let validationCount = 0;

    try {
      // Récupération des classes
      const classroomsData = await prisma.classroom.findMany({
        where: { professeurId: user.id },
        select: {
          id: true,
          nom: true
        }
      });
      classrooms = classroomsData;

      // Récupération des tâches à valider
      const tasksToValidate = await getTasksForProfessorValidation(user.id);
      validationCount = tasksToValidate.length;

      console.log(`✅ [PAGE] - Données prof chargées: ${classrooms.length} classes, ${validationCount} validations.`);
    } catch (dbError) {
      console.error('❌ [PAGE] - Erreur de base de données:', dbError);
      // On continue avec des valeurs par défaut plutôt que de faire planter la page
    }

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

  } catch (error) {
    console.error('❌ [PAGE] - Erreur critique dans TeacherDashboardPage:', error);
    
    // En production, vous pourriez logger l'erreur à un service externe
    // et afficher une page d'erreur appropriée
    
    return (
      <DashboardErrorState 
        message="Impossible de charger le tableau de bord. Veuillez vérifier votre connexion et réessayer." 
      />
    );
  }
}
