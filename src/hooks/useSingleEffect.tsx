// src/hooks/useSingleEffect.tsx - CORRECTION DÉFINITIVE
'use client';

import { useEffect, useRef } from 'react';

/**
 * Hook personnalisé qui exécute un effet une seule fois en production
 * En développement, il peut s'exécuter deux fois à cause de StrictMode
 * Mais il garantit que les effets secondaires ne se produisent qu'une fois
 */
export const useSingleEffect = (effect: () => void | (() => void), deps: any[] = []) => {
  const hasRunRef = useRef(false);
  const cleanupRef = useRef<(() => void) | void>();
  
  useEffect(() => {
    // En développement avec StrictMode, l'effet peut s'exécuter deux fois
    // Mais nous voulons que l'effet principal ne s'exécute qu'une fois
    if (!hasRunRef.current) {
      hasRunRef.current = true;
      cleanupRef.current = effect();
    }
    
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = undefined;
      }
      // Ne pas réinitialiser hasRunRef ici pour éviter les ré-exécutions
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};