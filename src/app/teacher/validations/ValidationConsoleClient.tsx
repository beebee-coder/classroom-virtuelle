
// src/app/teacher/validations/ValidationConsoleClient.tsx
'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Loader2, X, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ProfessorValidationPayload, validateTaskByProfessor } from '@/lib/actions/teacher.actions';
import Image from 'next/image';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Task, StudentProgress, User } from '@prisma/client';
export const dynamic = 'force-dynamic';

type TaskForProfessorValidation = StudentProgress & {
  task: Task;
  student: Pick<User, 'id' | 'name'>;
};

interface ValidationConsoleClientProps {
  initialTasks: TaskForProfessorValidation[];
}

export function ValidationConsoleClient({ initialTasks }: ValidationConsoleClientProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  
  // State for custom points modal
  const [selectedTask, setSelectedTask] = useState<TaskForProfessorValidation | null>(null);
  const [customPoints, setCustomPoints] = useState<number | undefined>(undefined);

  const handleValidation = (payload: ProfessorValidationPayload) => {
    startTransition(async () => {
      try {
        const result = await validateTaskByProfessor(payload);
        toast({
          title: `Tâche ${payload.approved ? 'approuvée' : 'rejetée'} !`,
          description: `La tâche "${result.taskTitle}" de ${result.studentName} a été traitée.`,
        });
        setTasks(currentTasks => currentTasks.filter(t => t.id !== payload.progressId));
        if(selectedTask) setSelectedTask(null);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: 'Impossible de traiter la tâche.',
        });
      }
    });
  };

  const handleCustomPointsSubmit = () => {
      if (!selectedTask || customPoints === undefined) return;
      handleValidation({ progressId: selectedTask.id, approved: true, pointsAwarded: customPoints });
  }

  if (tasks.length === 0) {
    return <p className="text-muted-foreground text-center">Aucune tâche en attente de validation. Bravo !</p>;
  }

  return (
    <div className="space-y-6">
      {tasks.map(progress => (
        <Card key={progress.id}>
          <CardHeader>
            <CardTitle>{progress.task.title}</CardTitle>
            <CardDescription>
              Soumis par <span className="font-semibold">{progress.student.name}</span> pour {progress.task.points} points.
            </CardDescription>
          </CardHeader>
          {progress.submissionUrl && (
            <CardContent>
                <p className='text-sm font-medium mb-2'>Preuve soumise :</p>
                <div className="relative w-full h-64 rounded-lg overflow-hidden border">
                     <Image
                        src={progress.submissionUrl}
                        alt={`Preuve pour ${progress.task.title}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                </div>
            </CardContent>
          )}
          <CardFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={() => handleValidation({ progressId: progress.id, approved: true })}
              disabled={isPending}
              className="bg-green-600 hover:bg-green-700 w-full sm:w-auto flex-1"
            >
              <Check className="mr-2" /> Approuver
            </Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="secondary" disabled={isPending} className='w-full sm:w-auto'>
                         <Star className="mr-2" /> Approuver avec bonus/malus
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Points personnalisés pour "{progress.task.title}"</AlertDialogTitle>
                    </AlertDialogHeader>
                    <div>
                        <p className='text-sm text-muted-foreground mb-2'>Points par défaut : {progress.task.points}. Modifiez si nécessaire.</p>
                        <Label htmlFor="custom-points">Points à attribuer</Label>
                        <Input 
                            id="custom-points"
                            type="number" 
                            defaultValue={progress.task.points}
                            onChange={(e) => setCustomPoints(Number(e.target.value))}
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleValidation({ progressId: progress.id, approved: true, pointsAwarded: customPoints ?? progress.task.points })}>
                            Valider
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Button
              onClick={() => handleValidation({ progressId: progress.id, approved: false })}
              disabled={isPending}
              variant="destructive"
              className="w-full sm:w-auto"
            >
              <X className="mr-2" /> Rejeter
            </Button>
          </CardFooter>
        </Card>
      ))}
      {isPending && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center">
              <Loader2 className="h-10 w-10 text-white animate-spin" />
          </div>
      )}
    </div>
  );
}

    