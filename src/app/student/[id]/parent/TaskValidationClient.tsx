
// src/app/student/[id]/parent/TaskValidationClient.tsx
'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Send, Check, X, Star } from 'lucide-react';
import { setParentPassword, validateTaskByParent } from '@/lib/actions/parent.actions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';
import type { Task } from '@prisma/client';

type ValidationTask = Task & { progressId: string };

interface TaskValidationClientProps {
  studentId: string;
  studentName: string;
  initialTasksForValidation: ValidationTask[];
  isAuthenticated: boolean;
  hasPasswordSet: boolean;
}

export function TaskValidationClient({
  studentId,
  studentName,
  initialTasksForValidation,
  isAuthenticated,
  hasPasswordSet,
}: TaskValidationClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [password, setPassword] = useState(searchParams.get('pw') || '');
  const [tasks, setTasks] = useState(initialTasksForValidation);

  // State for detailed feedback modal
  const [feedbackTask, setFeedbackTask] = useState<ValidationTask | null>(null);
  const [taste, setTaste] = useState(5);
  const [presentation, setPresentation] = useState(5);
  const [autonomy, setAutonomy] = useState(5);
  const [comment, setComment] = useState('');
  const [recipeName, setRecipeName] = useState('');


  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.set('pw', password);
    const search = current.toString();
    const query = search ? `?${search}` : '';
    router.push(`/student/${studentId}/parent${query}`);
  };

  const handleSetPassword = () => {
      if (!password || password.length < 4) {
          toast({ variant: 'destructive', title: 'Mot de passe trop court', description: 'Veuillez choisir un mot de passe d\'au moins 4 caractères.' });
          return;
      }
      startTransition(async () => {
          try {
              await setParentPassword(studentId, password);
              toast({ title: 'Mot de passe défini !', description: 'Vous pouvez maintenant l\'utiliser pour vous connecter.' });
              // Reload with the new password to authenticate
              const current = new URLSearchParams(Array.from(searchParams.entries()));
              current.set('pw', password);
              router.push(`/student/${studentId}/parent?${current.toString()}`);
          } catch {
              toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de définir le mot de passe.' });
          }
      });
  }

  const handleValidate = (task: ValidationTask, approved: boolean) => {
    // Special case for cooking task
    if (approved && task.category === 'ART' && task.title.toLowerCase().includes('recette')) {
        setFeedbackTask(task);
        return;
    }

    startTransition(async () => {
      try {
        const { pointsAwarded } = await validateTaskByParent(task.progressId, approved);
        toast({
          title: `Tâche ${approved ? 'approuvée' : 'rejetée'} !`,
          description: `Vous avez accordé ${pointsAwarded} points à ${studentName}.`,
        });
        setTasks(currentTasks => currentTasks.filter(t => t.id !== task.id));
      } catch (error) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de valider la tâche.' });
      }
    });
  };

  const handleDetailedFeedbackSubmit = () => {
    if (!feedbackTask) return;

    startTransition(async () => {
        try {
            await validateTaskByParent(feedbackTask.progressId, true, { taste, presentation, autonomy, comment }, recipeName);
            toast({ title: 'Tâche validée avec succès!', description: `Le feedback détaillé a été enregistré.` });
            setTasks(currentTasks => currentTasks.filter(t => t.id !== feedbackTask.id));
            setFeedbackTask(null); // Close modal
        } catch {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de soumettre le feedback.' });
        }
    });
  }


  if (!hasPasswordSet) {
    return (
      <div className="space-y-4">
        <p>Pour sécuriser cet espace, veuillez définir un mot de passe parental.</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nouveau mot de passe"
            disabled={isPending}
          />
          <Button onClick={handleSetPassword} disabled={isPending || !password}>
            {isPending && <Loader2 className="animate-spin" />}
            Définir le mot de passe
          </Button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
        <div className='space-y-6'>
            {hasPasswordSet && searchParams.get('pw') && !isAuthenticated && (
                <Alert variant="destructive">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle>Accès Sécurisé</AlertTitle>
                  <AlertDescription>
                    Le mot de passe fourni est incorrect. Veuillez réessayer.
                  </AlertDescription>
                </Alert>
              )}
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <p>Veuillez saisir le mot de passe parental pour accéder à cet espace.</p>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mot de passe parental"
                    />
                    <Button type="submit">
                        <Send />
                        Accéder
                    </Button>
                </div>
            </form>
        </div>
    );
  }

  return (
    <div>
      {tasks.length === 0 ? (
        <p className="text-muted-foreground text-center">Aucune tâche en attente de votre validation pour le moment.</p>
      ) : (
        <div className="space-y-4">
          {tasks.map(task => (
            <Card key={task.id}>
              <CardHeader>
                <CardTitle>{task.title}</CardTitle>
                <CardDescription>{task.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-2">
                <Button onClick={() => handleValidate(task, true)} disabled={isPending} className="bg-green-600 hover:bg-green-700 w-full sm:w-auto">
                  <Check className="mr-2" /> Approuver (+{task.points} pts)
                </Button>
                <Button onClick={() => handleValidate(task, false)} disabled={isPending} variant="destructive" className="w-full sm:w-auto">
                  <X className="mr-2" /> Rejeter
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Detailed Feedback Modal */}
      <AlertDialog open={!!feedbackTask} onOpenChange={(open: boolean) => !open && setFeedbackTask(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Évaluation de la Recette : {feedbackTask?.title}</AlertDialogTitle>
                <AlertDialogDescription>
                    Évaluez la performance de {studentName} sur plusieurs critères.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-6 py-4">
                 <div className="space-y-2">
                    <Label htmlFor="recipeName">Nom de la recette réalisée</Label>
                    <Input id="recipeName" value={recipeName} onChange={(e) => setRecipeName(e.target.value)} placeholder="Ex: Gâteau au chocolat" />
                </div>
                <div className="space-y-2">
                    <Label>Goût : {taste}/10</Label>
                    <Slider value={[taste]} onValueChange={([v]: number[]) => setTaste(v)} max={10} step={1} />
                </div>
                 <div className="space-y-2">
                    <Label>Présentation : {presentation}/10</Label>
                    <Slider value={[presentation]} onValueChange={([v]: number[]) => setPresentation(v)} max={10} step={1} />
                </div>
                 <div className="space-y-2">
                    <Label>Autonomie : {autonomy}/10</Label>
                    <Slider value={[autonomy]} onValueChange={([v]: number[]) => setAutonomy(v)} max={10} step={1} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="comment">Commentaire (optionnel)</Label>
                    <Textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Un petit mot d'encouragement..." />
                </div>
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setFeedbackTask(null)} disabled={isPending}>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDetailedFeedbackSubmit} disabled={isPending || !recipeName}>
                    {isPending ? <Loader2 className="animate-spin" /> : 'Valider et donner les points'}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    