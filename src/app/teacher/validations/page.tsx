// src/app/teacher/validations/page.tsx
import { Suspense } from 'react';
import { BackButton } from "@/components/BackButton";
import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTasksForProfessorValidation, getPendingStudents, getTeacherClassrooms } from "@/lib/actions/teacher.actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ValidationConsoleClient } from "./ValidationConsoleClient";
import { StudentValidationConsole } from './StudentValidationConsole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, CheckSquare } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function ValidationsPage({ searchParams }: { searchParams: { tab?: string }}) {
  const session = await getAuthSession();
  if (session?.user?.role !== "PROFESSEUR") {
    redirect("/login");
  }

  const [tasksToValidate, pendingStudents, classrooms] = await Promise.all([
    getTasksForProfessorValidation(session.user.id),
    getPendingStudents(),
    getTeacherClassrooms(session.user.id)
  ]);
  
  const defaultTab = searchParams.tab === 'tasks' ? 'tasks' : 'students';

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-w-0">
      <div className="flex items-center gap-4 mb-8">
        <BackButton />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Console de Validation</h1>
          <p className="text-muted-foreground">Examinez et validez les soumissions et inscriptions de vos élèves.</p>
        </div>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="students">
            <UserPlus className="mr-2 h-4 w-4" />
            Élèves à valider ({pendingStudents.length})
          </TabsTrigger>
          <TabsTrigger value="tasks">
             <CheckSquare className="mr-2 h-4 w-4" />
            Tâches à valider ({tasksToValidate.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="students" className="mt-6">
           <Card>
              <CardHeader>
                  <CardTitle>Inscriptions en attente</CardTitle>
                  <CardDescription>Validez les nouveaux élèves et assignez-les à une classe pour leur donner accès à la plateforme.</CardDescription>
              </CardHeader>
              <CardContent>
                  <StudentValidationConsole 
                      initialStudents={pendingStudents}
                      classrooms={classrooms}
                  />
              </CardContent>
           </Card>
        </TabsContent>
        <TabsContent value="tasks" className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Tâches Soumises</CardTitle>
                    <CardDescription>Validez les tâches accomplies par les élèves pour leur attribuer des points.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ValidationConsoleClient initialTasks={tasksToValidate} />
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ValidationsPageWrapper({ searchParams }: { searchParams: { tab?: string }}) {
    return (
        <Suspense fallback={<div>Chargement de la console de validation...</div>}>
            <ValidationsPage searchParams={searchParams} />
        </Suspense>
    );
}
