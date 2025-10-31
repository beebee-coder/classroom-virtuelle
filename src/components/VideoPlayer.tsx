// src/components/VideoPlayer.tsx
'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState, memo, useRef } from 'react';
import { useTheme } from 'next-themes';
import type { ExcalidrawProps } from '@excalidraw/excalidraw/types/types';

// Charger dynamiquement le composant Excalidraw SANS rendu côté serveur (SSR)
const Excalidraw = dynamic(
  async () => {
    const excalidrawModule = await import('@excalidraw/excalidraw');
    return excalidrawModule.Excalidraw;
  },
  { ssr: false }
);

interface WhiteboardProps {
  sessionId: string;
  onWhiteboardChange: (elements: readonly any[], appState: any, files: any) => void;
  initialElements?: readonly any[];
  initialAppState?: any;
  isController: boolean;
}

export function Whiteboard({
  onWhiteboardChange,
  initialElements,
  initialAppState,
  isController,
}: WhiteboardProps) {
  const [excalidrawApi, setExcalidrawApi] = useState<any>(null);
  const { theme } = useTheme();
  const [currentTheme, setCurrentTheme] = useState<"light" | "dark">("light");
  
  // Références pour éviter les boucles infinies
  const initialElementsRef = useRef(initialElements);
  const initialAppStateRef = useRef(initialAppState);
  const isInitialMount = useRef(true);

  useEffect(() => {
    import('@excalidraw/excalidraw').then(excalidrawModule => {
       setCurrentTheme(theme === 'dark' ? excalidrawModule.THEME.DARK : excalidrawModule.THEME.LIGHT);
    });
  }, [theme]);
  
  // CORRECTION : Éviter la boucle infinie dans la mise à jour de la scène
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (excalidrawApi && initialElements) {
      // Vérifier si les données ont vraiment changé
      const hasElementsChanged = JSON.stringify(initialElements) !== JSON.stringify(initialElementsRef.current);
      const hasAppStateChanged = JSON.stringify(initialAppState) !== JSON.stringify(initialAppStateRef.current);
      
      if (hasElementsChanged || hasAppStateChanged) {
        excalidrawApi.updateScene({ 
          elements: initialElements,
          appState: initialAppState
        });
        
        // Mettre à jour les références
        initialElementsRef.current = initialElements;
        initialAppStateRef.current = initialAppState;
      }
    }
  }, [initialElements, initialAppState, excalidrawApi]);

  const handleOnChange = useCallback(
    (elements: readonly any[], appState: any, files: any) => {
      if (isController) {
        onWhiteboardChange(elements, appState, files);
      }
    },
    [isController, onWhiteboardChange]
  );

  // CORRECTION : Simplifier le rendu pour éviter les problèmes de menu
  return (
    <div className="h-full w-full">
      <Excalidraw
        excalidrawAPI={(api) => setExcalidrawApi(api)}
        theme={currentTheme}
        initialData={{
          elements: initialElements,
          appState: initialAppState,
        }}
        onChange={handleOnChange}
        viewModeEnabled={!isController}
        UIOptions={{
          canvasActions: {
            clearCanvas: isController,
            export: false,
            loadScene: isController,
            saveToActiveFile: false,
            toggleTheme: false,
            saveAsImage: true,
          },
          tools: {
            image: false,
          }
        }}
      />
    </div>
  );
}