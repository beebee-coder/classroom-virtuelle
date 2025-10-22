// src/components/CareerThemeWrapper.tsx
'use client';

import { useEffect, useState } from 'react';
import type { Metier } from '@prisma/client';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

interface CareerThemeWrapperProps {
  career?: Metier;
  children: React.ReactNode;
}

export function CareerThemeWrapper({ career, children }: CareerThemeWrapperProps) {
  const [theme, setTheme] = useState<any | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    // Si un métier est sélectionné, on applique son thème
    if (career && career.theme) {
      const careerTheme = career.theme as any;
      setTheme(careerTheme);
      
      document.documentElement.style.setProperty('--primary', careerTheme.primaryColor);
      document.documentElement.style.setProperty('--accent', careerTheme.accentColor);
      
      // Ajoute la classe du curseur au body
      if (careerTheme.cursor) {
        document.body.classList.add(careerTheme.cursor);
      }
      
    } else {
      // Sinon, on réinitialise aux valeurs par défaut
      setTheme(null);
      document.documentElement.style.removeProperty('--primary');
      document.documentElement.style.removeProperty('--accent');
    }

    // Fonction de nettoyage pour réinitialiser les styles en quittant la page
    return () => {
      document.documentElement.style.removeProperty('--primary');
      document.documentElement.style.removeProperty('--accent');
      if (theme?.cursor) {
        document.body.classList.remove(theme.cursor);
      }
    };
  }, [career, pathname]); // Se ré-exécute si le métier ou la page change

  const backgroundClass = theme?.backgroundColor || 'bg-background';
  const textClass = theme?.textColor || 'text-foreground';

  return (
    <div className={cn('theme-wrapper', textClass)}>
        <div className={cn(
            "fixed inset-0 -z-10 transition-all duration-500",
            backgroundClass
        )} />
        {children}
    </div>
  );
}
