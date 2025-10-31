'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState, memo } from 'react';
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
  const [MainMenu, setMainMenu] = useState<React.ComponentType<any> | null>(null);
  const [DefaultItems, setDefaultItems] = useState<any>(null);

  useEffect(() => {
    import('@excalidraw/excalidraw').then(excalidrawModule => {
       setCurrentTheme(theme === 'dark' ? excalidrawModule.THEME.DARK : excalidrawModule.THEME.LIGHT);
       setMainMenu(() => excalidrawModule.MainMenu);
       setDefaultItems(excalidrawModule.MainMenu?.DefaultItems);
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

  // Rendu conditionnel pour les éléments du menu
  const renderMainMenu = () => {
    if (!MainMenu || !DefaultItems) return null;
    
    return (
      <MainMenu>
        <DefaultItems.ClearCanvas />
        <DefaultItems.SaveAsImage />
        <DefaultItems.ChangeCanvasBackground />
      </MainMenu>
    );
  };
  
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
        {renderMainMenu()}
      </Excalidraw>
    </div>
  );
}