// src/components/CreateAnnouncementForm.tsx
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
import { Loader2, Megaphone } from 'lucide-react';
import { useFormStatus } from 'react-dom';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { createAnnouncement } from '@/lib/actions';
import type { Classroom } from '@prisma/client';

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Publier l'annonce
        </Button>
    )
}

interface CreateAnnouncementFormProps {
    classrooms: Pick<Classroom, 'id' | 'nom'>[];
}

export function CreateAnnouncementForm({ classrooms }: CreateAnnouncementFormProps) {
    const [open, setOpen] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const { toast } = useToast();

    const handleCreateAnnouncement = async (formData: FormData) => {
        try {
            await createAnnouncement(formData);
            toast({
                title: "Annonce publiée !",
                description: `L'annonce "${formData.get('title')}" a été publiée avec succès.`,
            });
            setOpen(false);
            formRef.current?.reset();
        } catch (error) {
             toast({
                variant: "destructive",
                title: "Erreur",
                description: "Impossible de publier l'annonce.",
            });
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Megaphone className="mr-2" />
                    Créer une annonce
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Créer une annonce</DialogTitle>
                    <DialogDescription>
                        Rédigez et publiez une annonce pour tous ou pour une classe spécifique.
                    </DialogDescription>
                </DialogHeader>
                <form ref={formRef} action={handleCreateAnnouncement} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="title" className="text-right">Titre</Label>
                        <Input id="title" name="title" placeholder="Ex: Devoirs pour demain" className="col-span-3" required />
                    </div>
                     <div className="grid grid-cols-4 items-start gap-4">
                        <Label htmlFor="content" className="text-right pt-2">Contenu</Label>
                        <Textarea id="content" name="content" placeholder="Détails de l'annonce..." className="col-span-3" required />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="target" className="text-right">Cible</Label>
                        <Select name="target" defaultValue="public" required>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Choisir une cible" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="public">Publique (Tous)</SelectItem>
                                {classrooms.map(classroom => (
                                    <SelectItem key={classroom.id} value={classroom.id}>Classe: {classroom.nom}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="attachmentUrl" className="text-right">Lien du Fichier (Optionnel)</Label>
                        <Input id="attachmentUrl" name="attachmentUrl" placeholder="https://..." className="col-span-3" />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                             <Button type="button" variant="secondary">Annuler</Button>
                        </DialogClose>
                        <SubmitButton />
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
