// src/components/Whiteboard.tsx
'use client';
import { Excalidraw, THEME, MainMenu } from "@excalidraw/excalidraw";
import type { ExcalidrawElement, ExcalidrawImperativeAPI, AppState, BinaryFiles } from '@excalidraw/excalidraw/types/types';
import { useCallback, useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

interface WhiteboardProps {
  sessionId: string;
  onWhiteboardChange: (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => void;
  initialElements?: readonly ExcalidrawElement[];
  initialAppState?: AppState;
  isController: boolean;
}

export function Whiteboard({
  onWhiteboardChange,
  initialElements,
  initialAppState,
  isController,
}: WhiteboardProps) {
  const [excalidrawApi, setExcalidrawApi] = useState<ExcalidrawImperativeAPI | null>(null);
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
    (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
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
        zenModeEnabled={!isController}
        UIOptions={{
          canvasActions: {
            clearCanvas: isController,
            export: false,
            loadScene: isController,
            saveToActiveFile: false,
            toggleTheme: false,
            saveAsImage: true,
          },
        }}
      >
        {isController && (
           <MainMenu>
              <MainMenu.DefaultItems.ClearCanvas />
              <MainMenu.DefaultItems.SaveAsImage />
              <MainMenu.DefaultItems.ToggleTheme />
              <MainMenu.DefaultItems.Help />
          </MainMenu>
        )}
      </Excalidraw>
    </div>
  );
}
