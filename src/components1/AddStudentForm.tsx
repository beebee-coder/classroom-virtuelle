// src/components/AddStudentForm.tsx
"use client";

import { useRef, useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Loader2, UserPlus } from 'lucide-react';
import { addStudentToClass } from '@/lib/actions';
import { useFormStatus } from 'react-dom';
import { useToast } from '@/hooks/use-toast';

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Ajouter l'élève
        </Button>
    )
}

export function AddStudentForm({ classroomId }: { classroomId: string }) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const formRef = useRef<HTMLFormElement>(null);
    const { toast } = useToast();

    const handleAddStudent = async (formData: FormData) => {
        startTransition(async () => {
            try {
                await addStudentToClass(formData);
                toast({
                    title: "Élève ajouté !",
                    description: `L'élève "${formData.get('name')}" a été ajouté à la classe.`,
                });
                setOpen(false);
                formRef.current?.reset();
            } catch (error) {
                 toast({
                    variant: "destructive",
                    title: "Erreur",
                    description: "Impossible d'ajouter l'élève.",
                });
            }
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <UserPlus className="mr-2" />
                    Ajouter un élève
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Ajouter un nouvel élève</DialogTitle>
                    <DialogDescription>
                        Entrez les informations de l'élève pour l'ajouter à la classe.
                    </DialogDescription>
                </DialogHeader>
                <form ref={formRef} action={handleAddStudent} className="grid gap-4 py-4">
                    <input type="hidden" name="classroomId" value={classroomId} />
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Nom</Label>
                        <Input id="name" name="name" placeholder="Ex: Jean Dupont" className="col-span-3" required disabled={isPending} />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">Email</Label>
                        <Input id="email" name="email" type="email" placeholder="Ex: jean.dupont@example.com" className="col-span-3" required disabled={isPending} />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="ambition" className="text-right">Ambition</Label>
                        <Input id="ambition" name="ambition" placeholder="Ex: Devenir astronaute" className="col-span-3" disabled={isPending} />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                             <Button type="button" variant="secondary" disabled={isPending}>Annuler</Button>
                        </DialogClose>
                        <SubmitButton />
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
