import { TaskEditor } from "@/components/TaskEditor";
import { BackButton } from "@/components/BackButton";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import type { Task } from "@prisma/client";

// ✅ FORCER LE RENDER DYNAMIQUE
export const dynamic = 'force-dynamic';

export default async function TasksPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'PROFESSEUR') {
    redirect("/login");
  }

  const tasks = await prisma.task.findMany({
    orderBy: {
      createdAt: 'desc'
    }
  });

  return (
    <div className="container flex w-full px-4 sm:px-6 lg:px-8 py-8 gap-6">

      <div className="flex items-center gap-4 mb-8">
        <BackButton />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Éditeur de Tâches</h1>
          <p className="text-muted-foreground">
            Créez et gérez les tâches pour tous les élèves.
          </p>
        </div>
      </div>
      
      <TaskEditor initialTasks={tasks} />
      </div>

  );
}
