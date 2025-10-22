
// src/components/TaskList.tsx
"use client";

import { Task, StudentProgress, TaskType, ProgressStatus, ValidationType } from "@prisma/client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { CheckCircle2, Circle, Loader2, Award, Calendar, Zap, FileUp, Download, ClockIcon, KeyRound } from "lucide-react";
import { Button } from "./ui/button";
import { completeTask } from "@/lib/actions/task.actions";
import { useTransition, useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { startOfDay, startOfWeek, startOfMonth, isAfter } from 'date-fns';
import { CloudinaryUploadWidget } from "./CloudinaryUploadWidget";
import Link from "next/link";
import { AppTask } from "@/lib/types";

interface TaskListProps {
  tasks: AppTask[];
  studentProgress: StudentProgress[];
  studentId: string;
  isTeacherView: boolean;
}

const getTaskStatusInPeriod = (task: AppTask, progress: StudentProgress[]): ProgressStatus | null => {
    const now = new Date();
    let periodStart: Date;

    switch (task.type) {
        case 'DAILY': periodStart = startOfDay(now); break;
        case 'WEEKLY': periodStart = startOfWeek(now, { weekStartsOn: 1 }); break;
        case 'MONTHLY': periodStart = startOfMonth(now); break;
        default: // ONE_TIME tasks are always in their period
            const oneTimeProgress = progress.find(p => p.taskId === task.id);
            return oneTimeProgress?.status ?? null;
    }

    const relevantProgress = progress.find(p => p.taskId === task.id && p.completionDate && isAfter(new Date(p.completionDate), periodStart));

    return relevantProgress?.status ?? null;
}


function TaskItem({ task, studentId, initialStatus, isTeacherView, onTaskUpdate }: { task: AppTask, studentId: string, initialStatus: ProgressStatus | null, isTeacherView: boolean, onTaskUpdate: (taskId: string, newProgress: StudentProgress) => void }) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const [status, setStatus] = useState(initialStatus);

    useEffect(() => {
        setStatus(initialStatus);
    }, [initialStatus]);


    const handleComplete = (submissionUrl?: string) => {
        if (isTeacherView || isPending) return;

        // Optimistic update
        setStatus(ProgressStatus.PENDING_VALIDATION); 

        startTransition(async () => {
            try {
                const newProgress = await completeTask(task.id, submissionUrl);
                toast({
                    title: newProgress.status === 'COMPLETED' ? "Tâche accomplie !" : "Preuve soumise !",
                    description: newProgress.status === 'COMPLETED'
                        ? `Vous avez gagné ${task.points} points.`
                        : "Votre tâche est en attente de validation.",
                });
                onTaskUpdate(task.id, newProgress);
                setStatus(newProgress.status);
            } catch (error) {
                setStatus(initialStatus); // Rollback on error
                toast({
                    variant: "destructive",
                    title: "Erreur",
                    description: error instanceof Error ? error.message : "Impossible de valider la tâche.",
                });
            }
        });
    }

    const handleUploadSuccess = (result: any) => {
        handleComplete(result.info.secure_url);
    };

    const isCompletedOrVerified = status === ProgressStatus.COMPLETED || status === ProgressStatus.VERIFIED;
    const isPendingValidation = status === ProgressStatus.PENDING_VALIDATION;
    const isParentValidation = task.validationType === ValidationType.PARENT;
    const isProfessorValidation = task.validationType === ValidationType.PROFESSOR;
    const isAutomaticValidation = task.validationType === ValidationType.AUTOMATIC;


    const renderActionButton = () => {
        if (isTeacherView || isCompletedOrVerified || isAutomaticValidation) {
            if (isAutomaticValidation) {
                return (
                     <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium pr-2">
                        <ClockIcon className="h-4 w-4" />
                        <span>Auto</span>
                    </div>
                )
            }
            return null;
        };

        if (isPendingValidation) {
            const icon = isParentValidation ? <KeyRound className="mr-2 h-4 w-4" /> : <ClockIcon className="mr-2 h-4 w-4" />;
            const text = isParentValidation ? "Parent" : "En attente";
            return (
                <Button size="sm" variant="secondary" disabled>
                   {icon} {text}
                </Button>
            );
        }

        if (isParentValidation) {
            return (
                <Button size="sm" onClick={() => handleComplete()} disabled={isPending}>
                    {isPending ? <Loader2 className="animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                    Demander validation
                </Button>
            );
        }
        
        if (task.requiresProof) {
            return (
                 <CloudinaryUploadWidget onUpload={handleUploadSuccess}>
                    {({ open }) => (
                        <Button size="sm" onClick={open} disabled={isPending}>
                            {isPending ? <Loader2 className="animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                            Soumettre
                        </Button>
                    )}
                </CloudinaryUploadWidget>
            );
        }

        return (
            <Button
                size="sm"
                onClick={() => handleComplete()}
                disabled={isPending}
            >
                {isPending ? <Loader2 className="animate-spin" /> : 'Valider'}
            </Button>
        );
    }
    
    const getStatusIcon = () => {
        if (isCompletedOrVerified) {
            return <CheckCircle2 className="h-6 w-6 text-green-500" />;
        }
        if (isPendingValidation) {
            if (isParentValidation) {
                return <KeyRound className="h-6 w-6 text-amber-500" />;
            }
            return <ClockIcon className="h-6 w-6 text-amber-500" />;
        }
        if (isAutomaticValidation) {
            return <ClockIcon className="h-6 w-6 text-blue-500" />;
        }
        return <Circle className="h-6 w-6 text-muted-foreground" />;
    };


    return (
        <div className="flex items-start gap-4 py-3">
            <div className="flex-shrink-0 pt-1">
                {getStatusIcon()}
            </div>
            <div className="flex-grow">
                <p className={cn("font-medium", isCompletedOrVerified && "line-through text-muted-foreground")}>
                    {task.title}
                </p>
                <p className="text-xs text-muted-foreground">{task.description}</p>
                {task.attachmentUrl && (
                    <Button variant="outline" size="sm" asChild className="mt-2">
                        <Link href={task.attachmentUrl} target="_blank">
                            <Download className="mr-2 h-4 w-4" />
                            Télécharger la pièce jointe
                        </Link>
                    </Button>
                )}
            </div>
            <div className="flex items-center gap-2 pt-1">
                 <div className="flex items-center gap-1 text-amber-500 font-bold text-sm">
                    <Award className="h-4 w-4" />
                    <span>{task.points}</span>
                </div>
                {renderActionButton()}
            </div>
        </div>
    )
}

export function TaskList({ tasks, studentProgress, studentId, isTeacherView }: TaskListProps) {
  const [isClient, setIsClient] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<string, StudentProgress>>(() => {
    const map: Record<string, StudentProgress> = {};
    studentProgress.forEach(p => {
        if (!map[p.taskId] || new Date(p.completionDate as Date) > new Date(map[p.taskId].completionDate as Date)) {
            map[p.taskId] = p;
        }
    });
    return map;
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleTaskUpdate = (taskId: string, newProgress: StudentProgress) => {
    setProgressMap(prev => ({ ...prev, [taskId]: newProgress }));
  };

  const dailyTasks = tasks.filter(t => t.type === TaskType.DAILY);
  const weeklyTasks = tasks.filter(t => t.type === TaskType.WEEKLY);
  const monthlyTasks = tasks.filter(t => t.type === TaskType.MONTHLY);
  
  const taskGroups = [
    { title: "Quotidien", tasks: dailyTasks, icon: Zap },
    { title: "Hebdomadaire", tasks: weeklyTasks, icon: Calendar },
    { title: "Mensuel", tasks: monthlyTasks, icon: Award }
  ];

  if (!isClient) {
    return <div className="h-48 w-full animate-pulse rounded-md bg-muted/50"></div>;
  }

  return (
    <Accordion type="multiple" defaultValue={['Quotidien', 'Hebdomadaire', 'Mensuel']} className="w-full">
      {taskGroups.map(group => (
        group.tasks.length > 0 && (
          <AccordionItem value={group.title} key={group.title}>
              <AccordionTrigger>
                  <div className="flex items-center gap-2">
                      <group.icon className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-lg">{group.title}</span>
                  </div>
              </AccordionTrigger>
              <AccordionContent>
                   <div className="divide-y">
                       {group.tasks.map(task => (
                          <TaskItem
                              key={task.id}
                              task={task}
                              studentId={studentId}
                              initialStatus={getTaskStatusInPeriod(task, Object.values(progressMap))}
                              isTeacherView={isTeacherView}
                              onTaskUpdate={handleTaskUpdate}
                          />
                      ))}
                   </div>
              </AccordionContent>
          </AccordionItem>
        )
      ))}
    </Accordion>
  )
}
