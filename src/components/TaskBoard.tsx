
// src/components/TaskBoard.tsx
'use client';

import { useMemo, useState, useTransition } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, CheckCircle, Clock, FileUp, Loader2, KeyRound } from 'lucide-react';
import { ProgressStatus, Task, TaskType, TaskCategory, TaskDifficulty, ValidationType, StudentProgress } from '@/lib/types';
import { completeTask } from '@/lib/actions/task.actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { CloudinaryUploadWidget } from './CloudinaryUploadWidget';
import { AppTask } from '@/lib/types';


interface TaskBoardProps {
  tasks: AppTask[];
  studentProgress: StudentProgress[];
  studentId: string;
}

const taskTypeOrder: TaskType[] = [TaskType.DAILY, TaskType.WEEKLY, TaskType.MONTHLY];
const taskTypeTranslations: Record<TaskType, string> = {
  [TaskType.DAILY]: 'Quotidien',
  [TaskType.WEEKLY]: 'Hebdomadaire',
  [TaskType.MONTHLY]: 'Mensuel',
};

export function TaskBoard({ tasks, studentProgress, studentId }: TaskBoardProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isCompleting, startCompleting] = useTransition();

  const progressMap = useMemo(() => {
    return new Map(studentProgress.map((p) => [p.taskId, p]));
  }, [studentProgress]);

  const groupedTasks = useMemo(() => {
    const groups = Object.values(TaskType).reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {} as Record<TaskType, AppTask[]>);
    
    tasks.forEach((task) => {
      if (groups[task.type]) {
        groups[task.type].push(task);
      }
    });
    return groups;
  }, [tasks]);

  const handleSimpleCompletion = (taskId: string) => {
    startCompleting(async () => {
      try {
        await completeTask(taskId);
        toast({ title: 'Tâche soumise!', description: 'Ta demande de validation a été envoyée.' });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de soumettre la tâche.' });
      }
    });
  };
  
  const handleProofSubmission = (taskId: string, result: any) => {
    const submissionUrl = result.info.secure_url;
     startCompleting(async () => {
      try {
        await completeTask(taskId, submissionUrl);
        toast({ title: 'Preuve envoyée!', description: 'Ta preuve a été soumise pour validation.' });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de soumettre la preuve.' });
      }
    });
  }

  const handleParentValidationRequest = (taskId: string) => {
     startCompleting(async () => {
      try {
        await completeTask(taskId);
        toast({ 
          title: 'Demande envoyée!', 
          description: 'Demande à tes parents de valider la tâche dans leur espace.',
          action: (
            <Button variant="outline" size="sm" onClick={() => router.push(`/student/${studentId}/parent`)}>
              Aller à l'espace parent
            </Button>
          )
        });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de demander la validation.' });
      }
    });
  }

  const getTaskStatus = (task: Task) => {
    const progress = progressMap.get(task.id);
    if (progress) {
      if (progress.status === 'VERIFIED') return 'validated';
      if (progress.status === 'PENDING_VALIDATION') return 'pending';
      if (progress.status === 'REJECTED') return 'rejected';
    }
    return 'todo';
  };

  const renderTaskCard = (task: Task) => {
    const status = getTaskStatus(task);

    return (
      <Card key={task.id} className="mb-4">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-lg">{task.title}</CardTitle>
                <CardDescription>{task.description}</CardDescription>
            </div>
            <Badge variant={status === 'validated' ? 'default' : 'secondary'}>
                {task.points} pts
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {status === 'validated' && (
             <div className="flex items-center text-green-600">
                <CheckCircle className="mr-2 h-5 w-5" />
                <p className="font-semibold">Validée !</p>
            </div>
          )}
          {status === 'pending' && (
             <div className="flex items-center text-yellow-600">
                <Clock className="mr-2 h-5 w-5" />
                <p className="font-semibold">En attente de validation...</p>
            </div>
          )}
           {status === 'rejected' && (
             <div className="flex items-center text-red-600">
                <Clock className="mr-2 h-5 w-5" />
                <p className="font-semibold">Rejetée. Soumettre à nouveau.</p>
            </div>
          )}
          {(status === 'todo' || status === 'rejected') && (
            <div className="flex flex-col sm:flex-row gap-2">
                {task.requiresProof ? (
                     <CloudinaryUploadWidget onUpload={(result) => handleProofSubmission(task.id, result)}>
                        {({ open, loaded }) => (
                           <Button onClick={() => open()} disabled={isCompleting || !loaded} className="w-full sm:w-auto">
                            {isCompleting ? <Loader2 className="animate-spin" /> : <FileUp />}
                            <span>Soumettre une preuve</span>
                        </Button>
                        )}
                    </CloudinaryUploadWidget>
                ) : task.validationType === 'PARENT' ? (
                     <Button onClick={() => handleParentValidationRequest(task.id)} disabled={isCompleting} className="w-full sm:w-auto">
                        {isCompleting ? <Loader2 className="animate-spin" /> : <KeyRound />}
                        <span>Demander validation parentale</span>
                    </Button>
                ) : (
                    <Button onClick={() => handleSimpleCompletion(task.id)} disabled={isCompleting} className="w-full sm:w-auto">
                        {isCompleting ? <Loader2 className="animate-spin" /> : <Check />}
                        <span>Marquer comme fait</span>
                    </Button>
                )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Tabs defaultValue={'DAILY'} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        {taskTypeOrder.map((type) => (
          <TabsTrigger key={type} value={type}>
            {taskTypeTranslations[type]}
          </TabsTrigger>
        ))}
      </TabsList>
      {taskTypeOrder.map((type) => (
        <TabsContent key={type} value={type}>
            {groupedTasks[type] && groupedTasks[type].length > 0 ? (
                groupedTasks[type].map(renderTaskCard)
            ) : (
                <p className="text-sm text-muted-foreground mt-4 text-center">Aucune tâche {taskTypeTranslations[type]?.toLowerCase()} pour le moment.</p>
            )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
