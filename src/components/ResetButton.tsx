// src/components/ResetButton.tsx
"use client";

import React, { useState, isValidElement, Fragment } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "./ui/button";
import { Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { resetAllStudentData } from '@/lib/actions/teacher.actions';

interface ResetButtonProps {
  children?: React.ReactNode;
  className?: string;
}

export function ResetButton({ children, className }: ResetButtonProps) {
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const result = await resetAllStudentData();
      toast({
        title: "Réinitialisation réussie",
        description: result.message,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur de réinitialisation",
        description: error instanceof Error ? error.message : "Une erreur inconnue est survenue.",
      });
    } finally {
      setIsResetting(false);
    }
  };

  // ✅ Garantir qu'on a un seul élément React valide
  let triggerElement: React.ReactElement;

  if (children) {
    // Si c'est un seul élément valide, on l'utilise
    if (isValidElement(children)) {
      triggerElement = children;
    } else {
      // Sinon, on enveloppe dans un Fragment ou un div (car Radix exige un seul élément)
      // Mais on ne peut pas passer un tableau ou du texte à asChild
      // Donc on utilise un <span> neutre pour wrapper
      triggerElement = <span className={className}>{children}</span>;
    }
  } else {
    triggerElement = (
      <Button variant="destructive" className={className}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Remise à zéro
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {triggerElement}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est irréversible. Elle supprimera toutes les progressions, les classements et réinitialisera les points de tous les élèves. Ceci est généralement utilisé à la fin d'un trimestre ou d'une année scolaire.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isResetting}>Annuler</AlertDialogCancel>
          <AlertDialogAction asChild disabled={isResetting}>
            <Button
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
            >
              {isResetting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Confirmer la remise à zéro complète
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}