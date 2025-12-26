
import { TaskEditor } from "@/components/TaskEditor";
import { BackButton } from "@/components/BackButton";
import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActiveTasks } from '@/lib/actions/task.actions';

export const dynamic = 'force-dynamic';

export default async function TasksPage() {
  const session = await getAuthSession();
  if (session?.user?.role !== 'PROFESSEUR') {
    redirect("/login");
  }

  const tasks = await getActiveTasks();

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-w-0">
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
