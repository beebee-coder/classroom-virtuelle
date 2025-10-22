// src/app/teacher/tasks/page.tsx
import { TaskEditor } from "@/components/TaskEditor";
import { BackButton } from "@/components/BackButton";
import { getAuthSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Task, TaskType, TaskCategory, TaskDifficulty, ValidationType, Role } from "@prisma/client";


// DUMMY DATA
const dummyTasks: Task[] = [
    { id: '1', title: 'Faire son lit', description: 'Un lit bien fait, une journée bien commencée !', points: 10, type: TaskType.DAILY, category: TaskCategory.HOME, difficulty: TaskDifficulty.EASY, validationType: ValidationType.PARENT, requiresProof: false, isActive: true, attachmentUrl: null, startTime: null, duration: null },
    { id: '2', title: 'Lire 15 minutes', description: 'Un chapitre par jour pour voyager.', points: 15, type: TaskType.DAILY, category: TaskCategory.LANGUAGE, difficulty: TaskDifficulty.EASY, validationType: ValidationType.PARENT, requiresProof: false, isActive: true, attachmentUrl: null, startTime: null, duration: null },
    { id: '3', title: 'Ranger sa chambre', description: 'Un espace propre pour des idées claires.', points: 50, type: TaskType.WEEKLY, category: TaskCategory.HOME, difficulty: TaskDifficulty.MEDIUM, validationType: ValidationType.PARENT, requiresProof: true, isActive: true, attachmentUrl: null, startTime: null, duration: null },
    { id: '4', title: 'Exercice de maths', description: 'Résoudre une série de problèmes complexes.', points: 70, type: TaskType.WEEKLY, category: TaskCategory.MATH, difficulty: TaskDifficulty.MEDIUM, validationType: ValidationType.PROFESSOR, requiresProof: true, isActive: true, attachmentUrl: null, startTime: null, duration: null },
    { id: '5', title: 'Projet créatif mensuel', description: 'Réaliser une recette de cuisine et la présenter.', points: 200, type: TaskType.MONTHLY, category: TaskCategory.ART, difficulty: TaskDifficulty.HARD, validationType: ValidationType.PARENT, requiresProof: true, isActive: true, attachmentUrl: null, startTime: null, duration: null },
    { id: '6', title: 'Exposé scientifique', description: 'Préparer et présenter un sujet scientifique.', points: 250, type: TaskType.MONTHLY, category: TaskCategory.SCIENCE, difficulty: TaskDifficulty.HARD, validationType: ValidationType.PROFESSOR, requiresProof: true, isActive: true, attachmentUrl: null, startTime: null, duration: null },
];

export default async function TasksPage() {
  const session = await getAuthSession();
  if (session?.user.role !== Role.PROFESSEUR) {
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
