// src/components/ResetButton.tsx
"use client";

import { useState } from 'react';
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

export function ResetButton() {
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

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">
          <RefreshCw className="mr-2 h-4 w-4" />
          Remise à zéro
        </Button>
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
          <AlertDialogAction onClick={handleReset} disabled={isResetting} asChild>
             <Button variant="destructive">
                {isResetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Confirmer la remise à zéro complète
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
