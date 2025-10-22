// src/components/TeacherCareerSelector.tsx
'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { setStudentCareer } from '@/lib/actions';
import { Loader2 } from 'lucide-react';
import { Metier } from '@prisma/client';

interface TeacherCareerSelectorProps {
  studentId: string;
  careers: Metier[];
  currentCareerId?: string | null;
}

export function TeacherCareerSelector({
  studentId,
  careers,
  currentCareerId,
}: TeacherCareerSelectorProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCareerChange = (newCareerId: string) => {
    startTransition(async () => {
      await setStudentCareer(studentId, newCareerId === 'none' ? null : newCareerId);
      router.refresh();
    });
  };

  return (
    <div className="mt-4 space-y-2">
      <Label htmlFor="career-select">Modifier le métier exploré</Label>
      <div className="flex items-center gap-2">
        <Select
          onValueChange={handleCareerChange}
          defaultValue={currentCareerId ?? 'none'}
          disabled={isPending}
        >
          <SelectTrigger id="career-select" className="w-full">
            <SelectValue placeholder="Choisir un métier..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucun</SelectItem>
            {careers.map((career) => (
              <SelectItem key={career.id} value={career.id}>
                {career.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isPending && <Loader2 className="h-5 w-5 animate-spin" />}
      </div>
    </div>
  );
}
