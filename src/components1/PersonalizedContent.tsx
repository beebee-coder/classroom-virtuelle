// src/components/PersonalizedContent.tsx
"use client";

import { useState } from 'react';
import { Button } from './ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { StudentWithStateAndCareer } from '@/lib/types';

interface PersonalizedContentProps {
  student: Pick<StudentWithStateAndCareer, 'ambition' | 'etat'>;
}

export function PersonalizedContent({ student }: PersonalizedContentProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGeneratePlan = () => {
    setIsGenerating(true);
    toast({
        title: "Fonctionnalité en cours de développement",
        description: "La génération de plan personnalisé sera bientôt disponible.",
    });
    setTimeout(() => setIsGenerating(false), 2000);
  };

  return (
    <div className="text-center p-4 sm:p-8 border-dashed border-2 border-foreground/20 rounded-lg flex flex-col items-center justify-center h-full">
      <p className="text-muted-foreground mb-4 text-sm sm:text-base">
        Prêt à explorer votre futur ? Générez un plan d'apprentissage personnalisé basé sur votre ambition.
      </p>
      <Button onClick={handleGeneratePlan} disabled={isGenerating}>
        {isGenerating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
            <Sparkles className="mr-2 h-4 w-4" />
        )}
        Générer mon plan
      </Button>
    </div>
  );
}
