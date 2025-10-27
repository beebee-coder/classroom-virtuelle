// src/components/CareerSelector.tsx
'use client';

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { setStudentCareer } from '@/lib/actions/student.actions';
import { Loader2 } from 'lucide-react';
import type { Metier } from '@prisma/client';

interface CareerSelectorProps {
  careers: Metier[];
  studentId: string;
  currentCareerId: string | null;
}

export function CareerSelector({ careers, studentId, currentCareerId }: CareerSelectorProps) {
  const [selectedCareer, setSelectedCareer] = useState<string | null>(currentCareerId);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleApplyCareer = async () => {
    if (selectedCareer === undefined) return;
    setIsLoading(true);
    try {
      await setStudentCareer(studentId, selectedCareer);
      toast({
        title: 'Thème appliqué !',
        description: `Le thème pour le métier a été mis à jour.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible d\'appliquer le thème.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <Select
        value={selectedCareer ?? 'aucun'}
        onValueChange={(value: string) => setSelectedCareer(value === 'aucun' ? null : value)}
        disabled={isLoading}
      >
        <SelectTrigger className="w-full sm:w-[280px]">
          <SelectValue placeholder="Choisir un métier..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="aucun">Aucun thème (défaut)</SelectItem>
          {careers.map((career) => (
            <SelectItem key={career.id} value={career.id}>
              {career.nom}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={handleApplyCareer} disabled={isLoading || selectedCareer === currentCareerId}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Appliquer le thème
      </Button>
    </div>
  );
}
