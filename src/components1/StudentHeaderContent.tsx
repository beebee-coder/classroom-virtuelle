// src/components/StudentHeaderContent.tsx
'use client';

import { StudentWithStateAndCareer } from '@/lib/types';
import { GraduationCap, Lightbulb } from 'lucide-react';

interface StudentHeaderContentProps {
  student: StudentWithStateAndCareer;
}

export function StudentHeaderContent({ student }: StudentHeaderContentProps) {
  const career = student.etat?.metier;
  const ambitionOrCareerText = career ? (
    <>Votre métier exploré : <span className="font-semibold text-foreground">{career.nom}</span></>
  ) : (
    <>Votre ambition : <span className="font-semibold italic text-foreground">"{student.ambition}"</span></>
  );

  const ambitionIcon = career ? <GraduationCap className="h-5 w-5 text-primary" /> : <Lightbulb className="h-5 w-5 text-accent" />;

  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      {ambitionIcon}
      <p>{ambitionOrCareerText}</p>
    </div>
  );
}
