// src/app/teacher/dashboard/TeacherDashboardClient.tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserPlus, Megaphone } from 'lucide-react';
import Link from 'next/link';
import { CreateAnnouncementForm } from '@/components/CreateAnnouncementForm';
import type { Session } from 'next-auth';
import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast'; // 🔹 ajout

interface ClassroomData {
  id: string;
  nom: string;
}

interface PendingStudent {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface TeacherDashboardClientProps {
  user: Session['user'];
  classrooms: ClassroomData[];
  validationCount: number; // valeur initiale SSR
}

export default function TeacherDashboardClient({ 
  user, 
  classrooms, 
  validationCount: initialValidationCount 
}: TeacherDashboardClientProps) {
  const hasLoggedRef = useRef(false);
  const { toast } = useToast(); // 🔹 toast
  const [validationCount, setValidationCount] = useState(initialValidationCount);
  const [pendingStudents, setPendingStudents] = useState<PendingStudent[]>([]);
  const previousStudentsRef = useRef<PendingStudent[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 🔹 Log initial
  useEffect(() => {
    if (!hasLoggedRef.current) {
      console.log('👨‍🏫 [DASHBOARD CLIENT] Rendu initial avec:', {
        user: user?.name,
        classroomsCount: classrooms.length,
        validationCount: initialValidationCount
      });
      hasLoggedRef.current = true;
    }
  }, [user?.name, classrooms.length, initialValidationCount]);

  // 🔹 Polling des élèves en attente
  useEffect(() => {
    const fetchPendingStudents = async () => {
      try {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();
    
        const res = await fetch('/api/teacher/pending-students', {
          method: 'GET',
          signal: abortControllerRef.current.signal,
          headers: { 'Cache-Control': 'no-cache' },
        });
    
        if (!res.ok) {
          console.warn('[DASHBOARD CLIENT] Échec du polling des élèves', { status: res.status });
          return;
        }
    
        // 🔹 Typage explicite de la réponse
        const data: { students: PendingStudent[] } = await res.json();
        const newStudents = data.students || [];
    
        // 🔹 Comparaison avec l'état précédent
        const previousStudents = previousStudentsRef.current;
        if (newStudents.length > previousStudents.length) {
          const previousIds = new Set(previousStudents.map(s => s.id));
          const newEntries = newStudents.filter(s => !previousIds.has(s.id)); // ✅ s est maintenant PendingStudent
    
          if (newEntries.length > 0) {
            const studentNames = newEntries.map(s => s.name).join(', ');
            toast({
              title: "Nouvel(s) élève(s) inscrit(s) !",
              description: `${newEntries.length} nouvel(s) élève(s) en attente de validation : ${studentNames}.`,
              duration: 8000,
            });
            console.log('🔔 [DASHBOARD CLIENT] Toast affiché pour nouveaux élèves', {
              count: newEntries.length,
              names: studentNames,
            });
          }
        }
    
        setPendingStudents(newStudents);
        setValidationCount(newStudents.length);
        previousStudentsRef.current = newStudents;
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('[DASHBOARD CLIENT] Erreur lors du polling des élèves', {
            message: error.message,
          });
        }
      }
    };

    fetchPendingStudents(); // immédiat
    intervalRef.current = setInterval(fetchPendingStudents, 20_000); // puis toutes les 20s

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [toast]);

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

        {/* Carte: Inscriptions en attente */}
        <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 h-full border-2 border-transparent hover:border-orange-200 min-w-0">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-3 bg-orange-100 rounded-full group-hover:bg-orange-200 transition-colors flex-shrink-0">
                <UserPlus className="h-6 w-6 text-orange-600" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg truncate">Inscriptions en attente</CardTitle>
                <CardDescription className="mt-1 truncate">
                  {validationCount > 0 ? (
                    <span className="text-orange-600 font-semibold [
                      @media (prefers-reduced-motion: no-preference) {
                        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                      }
                    ]">
                      {validationCount} élève(s) à valider
                    </span>
                  ) : (
                    "Aucune inscription en attente"
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col">
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              Validez les nouveaux comptes élèves et assignez-les à une classe.
            </p>
            <Link 
              href="/teacher/validations" 
              className="inline-flex items-center text-sm font-medium text-orange-600 hover:underline mt-auto"
              aria-label="Voir les inscriptions en attente"
            >
              Gérer les inscriptions
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

      {/* Section statistiques */}
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
                  Inscriptions en attente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{validationCount}</div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  À valider et assigner
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