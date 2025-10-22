
// src/app/teacher/validations/page.tsx
import { Header } from "@/components/Header";
import { BackButton } from "@/components/BackButton";
import { getAuthSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getTasksForProfessorValidation } from "@/lib/actions/teacher.actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ValidationConsoleClient } from "./ValidationConsoleClient";
import { CheckCircle } from "lucide-react";
import { Sidebar, SidebarContent, SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import Menu from "@/components/Menu";

export default async function ProfessorValidationPage() {
  const session = await getAuthSession();
  if (session?.user.role !== "PROFESSEUR") {
    redirect("/login");
  }

  const tasksToValidate = await getTasksForProfessorValidation(session.user.id);

  return (
    <SidebarProvider>
      <div className="flex flex-col min-h-screen">
        <Header user={session.user}>
          <SidebarTrigger />
        </Header>
        <div className="flex flex-1">
          <Sidebar>
            <SidebarContent>
              <Menu user={session.user} validationCount={tasksToValidate.length} />
            </SidebarContent>
          </Sidebar>
          <SidebarInset>
             <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="max-w-4xl mx-auto">
                  <div className="flex items-center gap-4 mb-8">
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
              </div>
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
