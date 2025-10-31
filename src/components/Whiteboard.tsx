// src/components/Whiteboard.tsx
'use client';
import { Excalidraw, THEME, MainMenu } from "@excalidraw/excalidraw";
import { ExcalidrawElement, ExcalidrawImperativeAPIRef } from '@excalidraw/excalidraw/types/types';
import { AppState, BinaryFiles } from '@excalidraw/excalidraw/types/data/types';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  const excalidrawApiRef = useRef<ExcalidrawImperativeAPIRef>(null);
  const { theme } = useTheme();
  const [currentTheme, setCurrentTheme] = useState(THEME.LIGHT);

  useEffect(() => {
    setCurrentTheme(theme === 'dark' ? THEME.DARK : THEME.LIGHT);
  }, [theme]);
  
  // Mettre à jour les données initiales quand elles changent
  useEffect(() => {
    if (excalidrawApiRef.current && initialElements) {
       excalidrawApiRef.current.updateScene({ 
        elements: initialElements,
        appState: initialAppState
      });
    }
  }, [initialElements, initialAppState]);

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
        ref={excalidrawApiRef}
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
