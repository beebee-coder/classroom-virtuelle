// src/app/student/[id]/parent/TaskValidationClient.tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { validateTaskByParent, setParentPassword } from '@/lib/actions/parent.actions';
import { Task } from '@prisma/client';
import { Award, Check, Loader2, Brain, Star, CheckCircle2, Utensils, MessageSquare } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';

type TaskForValidation = Task & { progressId: string };
type DetailedFeedback = { taste: number, presentation: number, autonomy: number, comment: string };

interface TaskItemProps {
  task: TaskForValidation;
  onValidate: (progressId: string, feedback?: DetailedFeedback | number, recipeName?: string) => void;
  isPending: boolean;
}

function DetailedValidationDialog({ task, onValidate, isPending }: Omit<TaskItemProps, 'onValidate'> & { onValidate: (feedback: DetailedFeedback, recipeName: string) => void; }) {
  const [open, setOpen] = useState(false);
  const [recipeName, setRecipeName] = useState('');
  const [taste, setTaste] = useState(80);
  const [presentation, setPresentation] = useState(80);
  const [autonomy, setAutonomy] = useState(80);
  const [comment, setComment] = useState('');

  const averageScore = Math.round((taste + presentation + autonomy) / 3);
  const calculatedPoints = Math.round(task.points * (averageScore / 100));

  const handleSubmit = () => {
    if (!recipeName.trim()) {
        alert("Veuillez entrer le nom de la recette.");
        return;
    }
    const feedback: DetailedFeedback = { taste, presentation, autonomy, comment };
    onValidate(feedback, recipeName);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={isPending} variant="secondary">
          <Utensils className="mr-2 h-4 w-4" />
          Évaluer le plat
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Évaluer la tâche: {task.title}</DialogTitle>
          <DialogDescription>
            Évaluez la performance de votre enfant sur plusieurs critères pour cette activité culinaire.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
             <Label htmlFor="recipeName">Nom de la recette</Label>
             <Input id="recipeName" value={recipeName} onChange={(e) => setRecipeName(e.target.value)} placeholder="Ex: Couscous aux légumes" />
          </div>
          <div className="space-y-4">
            <Label>Goût: {taste}%</Label>
            <Slider value={[taste]} onValueChange={(v) => setTaste(v[0])} />
          </div>
          <div className="space-y-4">
            <Label>Présentation: {presentation}%</Label>
            <Slider value={[presentation]} onValueChange={(v) => setPresentation(v[0])} />
          </div>
          <div className="space-y-4">
            <Label>Autonomie: {autonomy}%</Label>
            <Slider value={[autonomy]} onValueChange={(v) => setAutonomy(v[0])} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="comment">Commentaire (optionnel)</Label>
            <Textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Ex: Très bon et bien organisé !" />
          </div>
          <div className="text-center font-bold text-lg p-4 bg-amber-100/50 rounded-lg border border-amber-200">
            Score Moyen: {averageScore}% <br />
            Points attribués: {calculatedPoints} / {task.points}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : <Check />}
            Confirmer l'évaluation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TaskItem({ task, onValidate, isPending }: TaskItemProps) {
  // Logic to distinguish the new cooking task
  if (task.title === 'Projet créatif mensuel') {
    return (
      <div className="flex items-center gap-4 py-3 border-b last:border-b-0">
        <div className="flex-grow">
          <p className="font-medium">{task.title}</p>
          <p className="text-xs text-muted-foreground">{task.description}</p>
        </div>
        <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
          <Award className="h-4 w-4" />
          <span>{task.points}</span>
        </div>
        <DetailedValidationDialog 
          task={task}
          isPending={isPending}
          onValidate={(feedback, recipeName) => onValidate(task.progressId, feedback, recipeName)}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 py-3 border-b last:border-b-0">
      <div className="flex-grow">
        <p className="font-medium">{task.title}</p>
        <p className="text-xs text-muted-foreground">{task.description}</p>
      </div>
      <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
        <Award className="h-4 w-4" />
        <span>{task.points}</span>
      </div>
      <Button size="sm" onClick={() => onValidate(task.progressId)} disabled={isPending}>
        {isPending ? <Loader2 className="animate-spin" /> : <Check />}
        Valider
      </Button>
    </div>
  );
}


export function TaskValidationClient({
  studentId,
  studentName,
  initialTasksForValidation,
  isAuthenticated,
  hasPasswordSet,
}: {
  studentId: string;
  studentName: string;
  initialTasksForValidation: TaskForValidation[];
  isAuthenticated: boolean;
  hasPasswordSet: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [tasks, setTasks] = useState(initialTasksForValidation);
  const [lastValidated, setLastValidated] = useState<{ progressId: string, feedback: any, points: number, title: string } | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasPasswordSet) {
      if (password !== confirmPassword) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Les mots de passe ne correspondent pas.' });
        return;
      }
      if (password.length < 6) {
          toast({ variant: 'destructive', title: 'Erreur', description: 'Le mot de passe doit faire au moins 6 caractères.' });
          return;
      }
    }
    
    startTransition(async () => {
      try {
        if (!hasPasswordSet) {
            await setParentPassword(studentId, password);
            toast({ title: 'Mot de passe défini !', description: 'Vous pouvez maintenant valider les tâches.' });
        }
        router.push(`/student/${studentId}/parent?pw=${encodeURIComponent(password)}`);
        router.refresh(); // This will re-run the server component with the new password in URL
      } catch (error) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de définir ou vérifier le mot de passe.' });
      }
    });
  };
  
  const handleValidateTask = (progressId: string, feedback?: DetailedFeedback | number, recipeName?: string) => {
    startTransition(async () => {
        try {
            const taskToValidate = tasks.find(t => t.progressId === progressId);
            if (!taskToValidate) return;

            const validationResult = await validateTaskByParent(progressId, feedback, recipeName);
            
            setLastValidated({ 
                progressId, 
                feedback: typeof feedback === 'object' ? feedback : { accuracy: feedback }, 
                points: validationResult.pointsAwarded, 
                title: taskToValidate.title 
            });
            setTasks(prevTasks => prevTasks.filter(t => t.progressId !== progressId));
            
        } catch(error: any) {
            toast({ variant: 'destructive', title: 'Erreur', description: error.message || 'Impossible de valider la tâche.' });
        }
    })
  }
  
  const renderFeedbackDetails = (feedback: any) => {
    if (feedback.taste !== undefined) { // Detailed feedback
        const average = Math.round((feedback.taste + feedback.presentation + feedback.autonomy) / 3);
        return (
            <>
                 <p className='flex items-center gap-2'>
                    <Star className="h-4 w-4"/>
                    <strong>Score Moyen :</strong> {average}%
                </p>
                {feedback.comment && (
                     <p className='flex items-start gap-2'>
                        <MessageSquare className="h-4 w-4 mt-1"/>
                        <strong>Commentaire :</strong> "{feedback.comment}"
                    </p>
                )}
            </>
        )
    }
    if (feedback.accuracy) { // Simple accuracy feedback
         return (
            <p className='flex items-center gap-2'>
                <Brain className="h-4 w-4"/>
                <strong>Exactitude :</strong> {feedback.accuracy}%
            </p>
        )
    }
    return null;
  }


  if (isAuthenticated) {
    return (
      <div>
        {lastValidated && (
           <Alert variant="default" className="mb-6 border-green-500/50 bg-green-500/10 text-green-700">
             <CheckCircle2 className="h-4 w-4 !text-green-600" />
             <AlertTitle className='text-green-800 font-bold'>
               {`“${lastValidated.title}” validé !`}
             </AlertTitle>
             <AlertDescription className="text-green-700/90 mt-2 space-y-1">
                <p className='flex items-center gap-2'>
                    <Award className="h-4 w-4"/>
                    <strong>Points gagnés :</strong> {lastValidated.points} pts
                </p>
                {renderFeedbackDetails(lastValidated.feedback)}
             </AlertDescription>
           </Alert>
        )}
        <h3 className="text-lg font-semibold mb-4">Tâches en attente de validation pour {studentName} ({tasks.length})</h3>
        {tasks.length > 0 ? (
          <div className="divide-y">
            {tasks.map(task => (
              <TaskItem
                key={task.progressId}
                task={task}
                onValidate={handleValidateTask}
                isPending={isPending}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">Aucune tâche à valider pour le moment.</p>
        )}
      </div>
    );
  }

  // Password form for authentication or setting a new password
  return (
    <form onSubmit={handleSetPassword} className="space-y-4 max-w-sm mx-auto">
      <h3 className="font-semibold text-center">{hasPasswordSet ? `Entrez le mot de passe pour ${studentName}`: 'Définir un mot de passe parental'}</h3>
      <div className="space-y-2">
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {!hasPasswordSet && (
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmez le mot de passe</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
      )}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {hasPasswordSet ? 'Déverrouiller' : 'Enregistrer le mot de passe'}
      </Button>
    </form>
  );
}
