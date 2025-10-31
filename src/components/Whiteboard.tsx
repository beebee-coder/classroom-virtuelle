
'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState, memo, useRef } from 'react';
import { useTheme } from 'next-themes';
import type { ExcalidrawProps, MainMenuProps } from '@excalidraw/excalidraw/types/types';

// Charger dynamiquement le composant Excalidraw SANS rendu côté serveur (SSR)
const Excalidraw = dynamic(
  async () => {
    console.log("DYNAMIC IMPORT: Chargement de @excalidraw/excalidraw");
    const mod = await import('@excalidraw/excalidraw');
    return mod.Excalidraw;
  },
  { 
    ssr: false,
    loading: () => <p>Chargement du tableau blanc...</p>
  }
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
  const [MainMenu, setMainMenu] = useState<React.ComponentType<MainMenuProps> | null>(null);
  const [DefaultItems, setDefaultItems] = useState<any>(null);

  useEffect(() => {
    import('@excalidraw/excalidraw').then(excalidrawModule => {
       setCurrentTheme(theme === 'dark' ? excalidrawModule.THEME.DARK : excalidrawModule.THEME.LIGHT);
       setMainMenu(() => excalidrawModule.MainMenu);
       setDefaultItems(excalidrawModule.MainMenu.DefaultItems);
    });
  }, [theme]);
  
  // Mettre à jour les données initiales quand elles changent
  useEffect(() => {
    if (excalidrawApi && initialElements) {
       console.log('🖼️ [Whiteboard] useEffect: Mise à jour de la scène avec de nouvelles données initiales.');
      excalidrawApi.updateScene({ 
        elements: initialElements,
        appState: initialAppState
      });
    }
  }, [initialElements, initialAppState, excalidrawApi]);

  const handleOnChange = useCallback(
    (elements: readonly any[], appState: any, files: any) => {
       console.log('✍️ [Whiteboard] handleOnChange: Changement détecté, appel de onWhiteboardChange.');
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
  
  console.log(`🔄 [Whiteboard] Rendu. estContrôleur: ${isController}. Scène initiale fournie: ${!!initialElements}`);

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
