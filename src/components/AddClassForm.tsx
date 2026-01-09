// src/components/AddClassForm.tsx
"use client";

import { useRef, useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Loader2, PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createClass } from "@/lib/actions/class.actions";

interface AddClassFormProps {
  teacherId: string;
}

export function AddClassForm({ teacherId }: AddClassFormProps) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleCreateClass = async (formData: FormData) => {
    startTransition(async () => {
      try {
        formData.append("teacherId", teacherId);
        await createClass(formData);
        toast({
          title: "Classe créée !",
          description: `La classe "${formData.get("nom")}" a été ajoutée.`,
        });
        setOpen(false);
        formRef.current?.reset();
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de créer la classe.",
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2" />
          Ajouter une classe
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ajouter une nouvelle classe</DialogTitle>
          <DialogDescription>
            Saisissez le nom de la nouvelle classe que vous souhaitez créer.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={handleCreateClass} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="nom" className="text-right">
              Nom
            </Label>
            <Input
              id="nom"
              name="nom"
              placeholder="Ex: 6ème B"
              className="col-span-3"
              required
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={isPending}>
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer la classe
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
