'use client';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

// Importer les types seulement, pas le composant
import type { ExcalidrawProps } from '@excalidraw/excalidraw';

// Charger dynamiquement le composant Excalidraw SANS rendu côté serveur (SSR)
const Excalidraw = dynamic<ExcalidrawProps>(
  async () => (await import('@excalidraw/excalidraw')).Excalidraw,
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

  useEffect(() => {
    // Import THEME only on the client side
    import('@excalidraw/excalidraw').then(excalidrawModule => {
       setCurrentTheme(theme === 'dark' ? excalidrawModule.THEME.DARK : excalidrawModule.THEME.LIGHT);
    });
  }, [theme]);
  
  // Mettre à jour les données initiales quand elles changent
  useEffect(() => {
    if (excalidrawApi && initialElements) {
      excalidrawApi.updateScene({ 
        elements: initialElements,
        appState: initialAppState
      });
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
      >
      </Excalidraw>
    </div>
  );
}
