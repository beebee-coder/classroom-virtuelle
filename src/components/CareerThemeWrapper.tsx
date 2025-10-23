// src/components/CareerThemeWrapper.tsx
'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { Metier } from '@/lib/types';

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
      let careerTheme: any;
      try {
        // Le thème est stocké en tant que String JSON, il faut le parser
        careerTheme = typeof career.theme === 'string' ? JSON.parse(career.theme) : career.theme;
      } catch (e) {
        console.error("Failed to parse career theme:", e);
        careerTheme = null;
      }
      
      setTheme(careerTheme);
      
      if (careerTheme) {
        document.documentElement.style.setProperty('--primary', careerTheme.primaryColor);
        document.documentElement.style.setProperty('--accent', careerTheme.accentColor);
        
        // Ajoute la classe du curseur au body
        if (careerTheme.cursor) {
          document.body.classList.add(careerTheme.cursor);
        }
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
      const currentTheme = theme; // Capture theme value at the time of effect
      if (currentTheme?.cursor) {
        document.body.classList.remove(currentTheme.cursor);
      }
    };
  }, [career, pathname, theme]); // Se ré-exécute si le métier ou la page change

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
