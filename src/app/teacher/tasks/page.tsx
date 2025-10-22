// src/app/teacher/tasks/page.tsx
import { TaskEditor } from "@/components/TaskEditor";
import { BackButton } from "@/components/BackButton";
import { getAuthSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Task } from "@/lib/types";


// DUMMY DATA
const dummyTasks: Task[] = [
    { id: '1', title: 'Faire son lit', description: 'Un lit bien fait, une journée bien commencée !', points: 10, type: "DAILY", category: "HOME", difficulty: "EASY", validationType: "PARENT", requiresProof: false, isActive: true, attachmentUrl: null, startTime: null, duration: null },
    { id: '2', title: 'Lire 15 minutes', description: 'Un chapitre par jour pour voyager.', points: 15, type: "DAILY", category: "LANGUAGE", difficulty: "EASY", validationType: "PARENT", requiresProof: false, isActive: true, attachmentUrl: null, startTime: null, duration: null },
    { id: '3', title: 'Ranger sa chambre', description: 'Un espace propre pour des idées claires.', points: 50, type: "WEEKLY", category: "HOME", difficulty: "MEDIUM", validationType: "PARENT", requiresProof: true, isActive: true, attachmentUrl: null, startTime: null, duration: null },
    { id: '4', title: 'Exercice de maths', description: 'Résoudre une série de problèmes complexes.', points: 70, type: "WEEKLY", category: "MATH", difficulty: "MEDIUM", validationType: "PROFESSOR", requiresProof: true, isActive: true, attachmentUrl: null, startTime: null, duration: null },
    { id: '5', title: 'Projet créatif mensuel', description: 'Réaliser une recette de cuisine et la présenter.', points: 200, type: "MONTHLY", category: "ART", difficulty: "HARD", validationType: "PARENT", requiresProof: true, isActive: true, attachmentUrl: null, startTime: null, duration: null },
    { id: '6', title: 'Exposé scientifique', description: 'Préparer et présenter un sujet scientifique.', points: 250, type: "MONTHLY", category: "SCIENCE", difficulty: "HARD", validationType: "PROFESSOR", requiresProof: true, isActive: true, attachmentUrl: null, startTime: null, duration: null },
];

export default async function TasksPage() {
  const session = await getAuthSession();
  if (session?.user?.role !== 'PROFESSEUR') {
    redirect("/login");
  }

  const tasks = dummyTasks;

  return (
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
  );
}
```