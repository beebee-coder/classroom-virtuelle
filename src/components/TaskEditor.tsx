// src/components/TaskEditor.tsx
"use client";

import { useState, useTransition, useRef } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { saveTask, deleteTask } from "@/lib/actions/task.actions";
import { Loader2, PlusCircle, Edit, Trash } from 'lucide-react';
import { Task, TaskType, TaskCategory, TaskDifficulty, ValidationType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { ScrollArea } from "./ui/scroll-area";
import { Card } from "./ui/card";

interface TaskEditorProps {
  initialTasks: Task[];
}

export function TaskEditor({ initialTasks }: TaskEditorProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [isPending, startTransition] = useTransition();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  const handleFormAction = async (formData: FormData) => {
    startTransition(async () => {
        try {
            await saveTask(formData);
            toast({ title: `Tâche ${editingTask ? 'mise à jour' : 'créée'} avec succès !` });
            setDialogOpen(false);
            router.refresh(); 
        } catch (error) {
            toast({ variant: "destructive", title: "Erreur", description: "Impossible de sauvegarder la tâche." });
        }
    });
  }

  const openNewTaskDialog = () => {
    setEditingTask(null);
    setDialogOpen(true);
  };

  const openEditTaskDialog = (task: Task) => {
    setEditingTask(task);
    setDialogOpen(true);
  };
  
  const handleDelete = (id: string) => {
      startTransition(async () => {
          try {
              await deleteTask(id);
              toast({ title: 'Tâche supprimée' });
              router.refresh();
          } catch (error) {
              toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de supprimer la tâche.' });
          }
      });
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Dialog open={dialogOpen} onOpenChange={(isOpen) => {
          if (!isOpen) {
              setEditingTask(null);
          }
          setDialogOpen(isOpen);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Modifier la tâche' : 'Créer une nouvelle tâche'}</DialogTitle>
            <DialogDescription>
              Remplissez les détails de la tâche. Elle sera disponible pour tous les élèves.
            </DialogDescription>
          </DialogHeader>
          <form ref={formRef} action={handleFormAction} className="space-y-4">
            {editingTask && <input type="hidden" name="id" value={editingTask.id} />}
            <div>
              <Label htmlFor="title">Titre</Label>
              <Input id="title" name="title" defaultValue={editingTask?.title} required />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" defaultValue={editingTask?.description ?? ''} required />
            </div>
            <div>
              <Label htmlFor="points">Points</Label>
              <Input id="points" name="points" type="number" defaultValue={editingTask?.points} required />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fréquence</Label>
                  <Select name="type" defaultValue={editingTask?.type}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.values(TaskType).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Catégorie</Label>
                  <Select name="category" defaultValue={editingTask?.category}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.values(TaskCategory).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Difficulté</Label>
                  <Select name="difficulty" defaultValue={editingTask?.difficulty}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.values(TaskDifficulty).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Validation</Label>
                  <Select name="validationType" defaultValue={editingTask?.validationType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.values(ValidationType).map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <Checkbox id="requiresProof" name="requiresProof" defaultChecked={editingTask?.requiresProof ?? false} />
                <Label htmlFor="requiresProof">Nécessite une preuve (photo/fichier)</Label>
            </div>
            
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary" disabled={isPending}>Annuler</Button>
              </DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="animate-spin mr-2" />}
                {editingTask ? 'Sauvegarder' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <Card className="flex-1 flex flex-col min-h-0">
          <div className="flex justify-end p-6 pb-4">
             <Button onClick={openNewTaskDialog}>
                <PlusCircle className="mr-2" />
                Ajouter une tâche
            </Button>
          </div>
          <ScrollArea className="flex-1">
             <div className="p-6 pt-0">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Titre</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Fréquence</TableHead>
                        <TableHead>Catégorie</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {initialTasks.map(task => (
                        <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.title}</TableCell>
                        <TableCell>{task.points}</TableCell>
                        <TableCell>{task.type}</TableCell>
                        <TableCell>{task.category}</TableCell>
                        <TableCell className="space-x-2">
                            <Button variant="outline" size="icon" onClick={() => openEditTaskDialog(task)} disabled={isPending}>
                            <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="destructive" size="icon" onClick={() => handleDelete(task.id)} disabled={isPending}>
                            <Trash className="h-4 w-4" />
                            </Button>
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
             </div>
          </ScrollArea>
      </Card>
    </div>
  );
}
