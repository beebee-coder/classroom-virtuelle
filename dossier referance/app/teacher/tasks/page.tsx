// src/app/teacher/tasks/page.tsx
import { Header } from "@/components/Header";
import { TaskEditor } from "@/components/TaskEditor";
import { BackButton } from "@/components/BackButton";
import { getAuthSession } from "@/lib/session";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { Sidebar, SidebarContent, SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import Menu from "@/components/Menu";

export default async function TasksPage() {
  const session = await getAuthSession();
  if (session?.user.role !== "PROFESSEUR") {
    redirect("/login");
  }

  const tasks = await prisma.task.findMany({
    orderBy: {
      type: 'asc',
    }
  });

  return (
    <SidebarProvider>
      <div className="flex flex-col min-h-screen">
        <Header user={session.user}>
          <SidebarTrigger />
        </Header>
        <div className="flex flex-1">
          <Sidebar>
            <SidebarContent>
              <Menu user={session.user} />
            </SidebarContent>
          </Sidebar>
          <SidebarInset>
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="flex items-center gap-4 mb-8">
                  <BackButton />
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight">Éditeur de Tâches</h1>
                    <p className="text-muted-foreground">Créez et gérez les tâches pour tous les élèves.</p>
                  </div>
              </div>
              <TaskEditor initialTasks={tasks} />
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
