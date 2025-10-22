
// src/app/teacher/validations/ValidationConsoleClient.tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { validateTaskByProfessor, ProfessorValidationPayload } from '@/lib/actions/teacher.actions';
import { TaskForProfessorValidation } from '@/lib/types';
import { Award, Check, X, Loader2, Link as LinkIcon, User, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';

function RejectDialog({ onReject, isPending, taskId, studentName }: { onReject: (taskId: string, reason: string) => void, isPending: boolean, taskId: string, studentName: string }) {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState('');

    const handleSubmit = () => {
        if (!reason.trim()) {
            alert("Veuillez fournir une raison pour le rejet.");
            return;
        }
        onReject(taskId, reason);
        setOpen(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="destructive" disabled={isPending}>
                    <X className="mr-2 h-4 w-4" />
                    Rejeter
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Rejeter la tâche de {studentName}</DialogTitle>
                    <DialogDescription>
                        Expliquez pourquoi la soumission est rejetée. L'élève pourra la soumettre à nouveau.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="rejection-reason">Raison du rejet</Label>
                    <Textarea 
                        id="rejection-reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Ex: La photo est floue, le travail est incomplet..."
                    />
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
                    <Button variant="destructive" onClick={handleSubmit} disabled={isPending}>
                        {isPending ? <Loader2 className="animate-spin" /> : 'Confirmer le rejet'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function ApproveDialog({ onApprove, isPending, task, studentName }: { onApprove: (payload: ProfessorValidationPayload) => void, isPending: boolean, task: TaskForProfessorValidation, studentName: string }) {
    const [open, setOpen] = useState(false);
    const [accuracy, setAccuracy] = useState(100);

    const calculatedPoints = Math.round(task.task.points * (accuracy / 100));

    const handleSubmit = () => {
        onApprove({
            progressId: task.id,
            approved: true,
            pointsAwarded: calculatedPoints
        });
        setOpen(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="secondary" disabled={isPending}>
                    <Check className="mr-2 h-4 w-4" />
                    Valider
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Valider la tâche pour {studentName}</DialogTitle>
                    <DialogDescription>
                        Confirmez la validation et ajustez les points si nécessaire.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <p><strong>Tâche:</strong> {task.task.title}</p>
                    <div className="space-y-4">
                        <Label>Pourcentage de réussite: {accuracy}%</Label>
                        <Slider value={[accuracy]} onValueChange={(v) => setAccuracy(v[0])} />
                    </div>
                    <div className="text-center font-bold text-lg p-4 bg-green-100/50 rounded-lg border border-green-200">
                        Points attribués: {calculatedPoints} / {task.task.points}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
                    <Button onClick={handleSubmit} disabled={isPending}>
                        {isPending ? <Loader2 className="animate-spin" /> : 'Confirmer la validation'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export function ValidationConsoleClient({ initialTasks }: { initialTasks: TaskForProfessorValidation[] }) {
    const { toast } = useToast();
    const [tasks, setTasks] = useState(initialTasks);
    const [lastValidated, setLastValidated] = useState<{ studentName: string; taskTitle: string; points: number } | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleValidation = (payload: ProfessorValidationPayload) => {
        startTransition(async () => {
            try {
                const result = await validateTaskByProfessor(payload);
                setTasks(prevTasks => prevTasks.filter(t => t.id !== payload.progressId));
                setLastValidated({
                    studentName: result.studentName,
                    taskTitle: result.taskTitle,
                    points: result.pointsAwarded
                });
                toast({
                    title: "Tâche validée !",
                    description: `${result.studentName} a reçu ${result.pointsAwarded} points pour la tâche "${result.taskTitle}".`
                });
            } catch (error) {
                toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de valider la tâche.' });
            }
        });
    };

    const handleRejection = (progressId: string, reason: string) => {
        startTransition(async () => {
             try {
                const payload: ProfessorValidationPayload = { progressId, approved: false, rejectionReason: reason };
                const result = await validateTaskByProfessor(payload);
                setTasks(prevTasks => prevTasks.filter(t => t.id !== progressId));
                toast({
                    title: "Tâche rejetée",
                    description: `La soumission de ${result.studentName} a été rejetée.`,
                    variant: 'destructive'
                });
            } catch (error) {
                toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de rejeter la tâche.' });
            }
        })
    }

    if (tasks.length === 0) {
        return (
            <>
                {lastValidated && (
                   <Alert variant="default" className="mb-6 border-green-500/50 bg-green-500/10 text-green-700">
                     <Check className="h-4 w-4 !text-green-600" />
                     <AlertTitle className='text-green-800 font-bold'>
                       Validation réussie !
                     </AlertTitle>
                     <AlertDescription className="text-green-700/90 mt-2">
                        Vous avez attribué {lastValidated.points} points à {lastValidated.studentName} pour la tâche "{lastValidated.taskTitle}".
                     </AlertDescription>
                   </Alert>
                )}
                 <div className="text-center text-muted-foreground py-8">
                    <Info className="mx-auto h-8 w-8 mb-2" />
                    <p>Bravo ! Vous êtes à jour.</p>
                    <p>Aucune tâche n'est en attente de votre validation.</p>
                </div>
            </>
        )
    }

    return (
        <div className="divide-y">
            {tasks.map(task => (
                <div key={task.id} className="flex flex-col sm:flex-row items-start gap-4 py-4">
                    <div className="flex-grow">
                        <p className="font-semibold text-base">{task.task.title}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <User className="h-4 w-4"/> 
                            <span>{task.student.name}</span>
                        </div>
                        {task.submissionUrl && (
                             <Button variant="link" asChild className="p-0 h-auto mt-2 text-sm">
                                <Link href={task.submissionUrl} target='_blank' rel='noopener noreferrer'>
                                    <LinkIcon className="mr-2 h-4 w-4" />
                                    Voir la preuve
                                </Link>
                            </Button>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-amber-500 font-bold text-sm self-center">
                        <Award className="h-4 w-4" />
                        <span>{task.task.points} pts max.</span>
                    </div>
                    <div className="flex items-center gap-2 self-center shrink-0">
                        <RejectDialog
                          taskId={task.id}
                          studentName={task.student.name ?? 'l\'élève'}
                          isPending={isPending}
                          onReject={handleRejection}
                        />
                        <ApproveDialog
                          task={task}
                          studentName={task.student.name ?? 'l\'élève'}
                          isPending={isPending}
                          onApprove={handleValidation}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}
