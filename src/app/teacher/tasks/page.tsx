import { TaskEditor } from "@/components/TaskEditor";
import { BackButton } from "@/components/BackButton";
import { auth } from '@/auth';
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import type { Task } from "@prisma/client";

// ✅ FORCER LE RENDER DYNAMIQUE
export const dynamic = 'force-dynamic';

export default async function TasksPage() {
  const session = await auth();
  if (session?.user?.role !== 'PROFESSEUR') {
    redirect("/login");
  }

  const tasks = await prisma.task.findMany({
    orderBy: {
      createdAt: 'desc'
    }
  });

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ✅ CORRECTION: Structure améliorée avec conteneur approprié */}
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <BackButton />
            <div className="flex-1">
              <h1 className="text-3xl font-bold tracking-tight">Éditeur de Tâches</h1>
              <p className="text-muted-foreground mt-2">
                Créez et gérez les tâches pour tous les élèves.
              </p>
            </div>
          </div>
          
          {/* ✅ CORRECTION: Conteneur spécifique pour TaskEditor */}
          <div className="bg-card rounded-lg border shadow-sm">
            <TaskEditor initialTasks={tasks} />
          </div>
        </div>
      </div>
    </main>
  );
}