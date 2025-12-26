// src/components/CreateAnnouncementForm.tsx
"use client";

import React, { useRef, useState, isValidElement, Fragment } from 'react';
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
import { createAnnouncement } from '@/lib/actions/announcement.actions';
import { cn } from '@/lib/utils';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
      Publier l'annonce
    </Button>
  );
}

interface CreateAnnouncementFormProps {
  classrooms: { id: string; nom: string }[];
  children?: React.ReactNode;
  className?: string;
}

export function CreateAnnouncementForm({ classrooms, children, className }: CreateAnnouncementFormProps) {
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
  };

  // Garantir un seul élément enfant pour DialogTrigger avec asChild
  let triggerElement: React.ReactElement;

  if (children) {
    // Si children est un seul élément React valide, on l'utilise directement
    if (isValidElement(children)) {
      triggerElement = children;
    } else {
      // Sinon, on l'encapsule dans un span (ou Fragment ne suffit pas)
      triggerElement = <span>{children}</span>;
    }
  } else {
    triggerElement = (
      <Button variant="outline" className={className}>
        <Megaphone className="mr-2 h-4 w-4" aria-hidden="true" />
        Créer une annonce
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerElement}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Créer une annonce</DialogTitle>
          <DialogDescription>
            Rédigez et publiez une annonce pour tous ou pour une classe spécifique.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={handleCreateAnnouncement} className="grid gap-4 py-4">
          {/* Titre */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Titre
            </Label>
            <Input
              id="title"
              name="title"
              placeholder="Ex: Devoirs pour demain"
              required
              autoFocus
            />
          </div>

          {/* Contenu */}
          <div className="space-y-2">
            <Label htmlFor="content" className="text-sm font-medium">
              Contenu
            </Label>
            <Textarea
              id="content"
              name="content"
              placeholder="Détails de l'annonce..."
              required
              rows={3}
            />
          </div>

          {/* Cible */}
          <div className="space-y-2">
            <Label htmlFor="target" className="text-sm font-medium">
              Cible
            </Label>
            <Select name="target" defaultValue="public" required>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une cible" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Publique (Tous)</SelectItem>
                {classrooms.map(classroom => (
                  <SelectItem key={classroom.id} value={classroom.id}>
                    Classe: {classroom.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lien du fichier */}
          <div className="space-y-2">
            <Label htmlFor="attachmentUrl" className="text-sm font-medium">
              Lien du Fichier (Optionnel)
            </Label>
            <Input
              id="attachmentUrl"
              name="attachmentUrl"
              placeholder="https://..."
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Annuler
              </Button>
            </DialogClose>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}