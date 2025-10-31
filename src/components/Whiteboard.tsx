'use client';
import { Excalidraw, THEME, MainMenu } from "@excalidraw/excalidraw";
import { useCallback, useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

// Types simplifiés pour éviter les imports complexes
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
  const [currentTheme, setCurrentTheme] = useState<"light" | "dark">(THEME.LIGHT);

  useEffect(() => {
    setCurrentTheme(theme === 'dark' ? THEME.DARK : THEME.LIGHT);
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
        {isController && (
          <MainMenu>
            <MainMenu.DefaultItems.ClearCanvas />
            <MainMenu.DefaultItems.SaveAsImage />
            <MainMenu.DefaultItems.ChangeCanvasBackground />
            <MainMenu.Separator />
            <MainMenu.DefaultItems.Help />
          </MainMenu>
        )}
      </Excalidraw>
    </div>
  );
}