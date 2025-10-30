// src/app/teacher/validations/page.tsx
import { BackButton } from "@/components/BackButton";
import { auth } from '@/auth';
import { redirect } from "next/navigation";
import { getTasksForProfessorValidation } from "@/lib/actions/teacher.actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ValidationConsoleClient } from "./ValidationConsoleClient";
import { CheckCircle } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function ProfessorValidationPage() {
  const session = await auth();
  if (session?.user?.role !== "PROFESSEUR") {
    redirect("/login");
  }

  const tasksToValidate = await getTasksForProfessorValidation(session.user.id);

  return (
    <main className="container flex mx-auto px-4 sm:px-6 lg:px-8 py-8">

     
      <div className=" flex items-center gap-4 mb-8">
        <BackButton />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Console de Validation</h1>
          <p className="text-muted-foreground">Examinez et validez les soumissions de vos élèves.</p>
        </div>
      </div>

      <Card>
          <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                  <CheckCircle className="text-primary" />
                  Tâches en attente de validation
              </CardTitle>
              <CardDescription>
                  Validez les tâches accomplies par les élèves pour leur attribuer des points.
              </CardDescription>
          </CardHeader>
          <CardContent>
              <ValidationConsoleClient initialTasks={tasksToValidate} />
          </CardContent>
      </Card>
     
 
      </main>
  );
}
