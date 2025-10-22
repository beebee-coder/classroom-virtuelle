//src/components/CareerThemeWrapper.tsx
"use client";

import type { Metier } from '@prisma/client';
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import placeholderImages from '@/lib/placeholder-images.json';


interface CareerThemeWrapperProps {
  career?: Metier;
  children: React.ReactNode;
}

interface CustomCSSProperties extends React.CSSProperties {
    '--primary-hsl'?: string;
    '--accent-hsl'?: string;
}


export function CareerThemeWrapper({ career, children }: CareerThemeWrapperProps) {
    const [zoom, setZoom] = useState(1);
    const [blur, setBlur] = useState(8);
    const [themeStyles, setThemeStyles] = useState<CustomCSSProperties>({});
    
    const careerName = (career?.nom ? career.nom.toLowerCase() : 'default') as keyof typeof placeholderImages;
    const imageData = placeholderImages[careerName] || placeholderImages.default;

    useEffect(() => {
        const newStyles: CustomCSSProperties = career
            ? {
                '--primary-hsl': (career.theme as any)?.primaryColor,
                '--accent-hsl': (career.theme as any)?.accentColor,
              }
            : {
                '--primary-hsl': '207 90% 54%', // default primary
                '--accent-hsl': '36 100% 65%', // default accent
              };
        setThemeStyles(newStyles);
    }, [career]);


  const themeClasses = cn(
      career ? (career.theme as any)?.textColor : 'text-foreground',
      career ? (career.theme as any)?.cursor : 'cursor-default'
  );
    
    useEffect(() => {
        const handleWheel = (event: WheelEvent) => {
            // Check if the scroll event is happening inside the chat sheet (or any dialog)
            const target = event.target as HTMLElement;
            if (target.closest('[data-radix-sheet-content]')) {
              // If it is, don't do anything and let the default scroll happen
              return;
            }

            event.preventDefault();
            
            const zoomSpeed = 0.1;
            const minZoom = 1;
            const maxZoom = 2.5;
            const maxBlur = 8;
            
            setZoom(prevZoom => {
                const newZoom = prevZoom - event.deltaY * zoomSpeed * 0.1;
                const clampedZoom = Math.max(minZoom, Math.min(newZoom, maxZoom));
                
                // Calculate blur based on zoom
                const blurPercentage = (clampedZoom - minZoom) / (maxZoom - minZoom);
                const newBlur = maxBlur * (1 - blurPercentage);
                setBlur(newBlur);
                
                return clampedZoom;
            });
        };

        window.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            window.removeEventListener('wheel', handleWheel);
        };
    }, []);

  return (
    <div
      style={themeStyles}
      className={cn("transition-all duration-700 ease-in-out relative min-h-screen", themeClasses)}
    >
        <div 
          className="fixed inset-0 w-full h-full z-[-1] bg-cover bg-center transition-all duration-1000"
          style={{ 
              backgroundImage: `url(${imageData.url})`,
              transform: `scale(${zoom})`,
              filter: `blur(${blur}px)`
          }}
          data-ai-hint={imageData.hint}
        />
        <div className="fixed inset-0 w-full h-full z-[-1] bg-background/60" />
      
      {children}
    </div>
  );
}
