// src/components/CareerThemeWrapper.tsx - VERSION CORRIGÉE
'use client';

import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import type { Metier } from '@prisma/client';

interface CareerThemeWrapperProps {
  career?: Metier;
  children: React.ReactNode;
}

export function CareerThemeWrapper({ career, children }: CareerThemeWrapperProps) {
  const [theme, setTheme] = useState<any | null>(null);
  const pathname = usePathname();
  const previousThemeRef = useRef<any | null>(null);

  // ✅ CORRECTION : Supprimer 'theme' des dépendances pour éviter la boucle infinie
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
      
      // ✅ CORRECTION : Ne mettre à jour le thème que s'il a changé
      if (JSON.stringify(careerTheme) !== JSON.stringify(previousThemeRef.current)) {
        setTheme(careerTheme);
        previousThemeRef.current = careerTheme;
        
        if (careerTheme) {
          // ✅ CORRECTION : Appliquer les styles CSS directement
          document.documentElement.style.setProperty('--primary', careerTheme.primaryColor || '#000000');
          document.documentElement.style.setProperty('--accent', careerTheme.accentColor || '#ffffff');
          
          // Ajoute la classe du curseur au body
          if (careerTheme.cursor) {
            document.body.classList.add(careerTheme.cursor);
          }
        }
      }
      
    } else {
      // Sinon, on réinitialise aux valeurs par défaut
      // ✅ CORRECTION : Ne réinitialiser que si nécessaire
      if (theme !== null || previousThemeRef.current !== null) {
        setTheme(null);
        previousThemeRef.current = null;
        
        document.documentElement.style.removeProperty('--primary');
        document.documentElement.style.removeProperty('--accent');
        
        // ✅ CORRECTION : Supprimer toutes les classes de curseur potentielles
        document.body.classList.remove('cursor-default', 'cursor-pointer', 'cursor-crosshair');
      }
    }
  }, [career, pathname]); // ✅ CORRECTION : 'theme' retiré des dépendances

  // ✅ CORRECTION : Effet de nettoyage séparé pour gérer le démontage
  useEffect(() => {
    return () => {
      // Réinitialiser les styles uniquement lors du démontage du composant
      document.documentElement.style.removeProperty('--primary');
      document.documentElement.style.removeProperty('--accent');
      
      // Supprimer toutes les classes de curseur potentielles
      document.body.classList.remove('cursor-default', 'cursor-pointer', 'cursor-crosshair');
    };
  }, []); // ✅ CORRECTION : Dépendances vides - s'exécute uniquement au démontage

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