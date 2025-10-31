'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState, memo, useRef } from 'react';
import { useTheme } from 'next-themes';
// ⚠️ CORRECTION : Supprimer l'import de MainMenuProps qui n'existe pas
import type { ExcalidrawProps } from '@excalidraw/excalidraw/types/types';

// Charger dynamiquement le composant Excalidraw SANS rendu côté serveur (SSR)
const Excalidraw = dynamic(
  async () => {
    console.log("DYNAMIC IMPORT: Chargement de @excalidraw/excalidraw");
    const mod = await import('@excalidraw/excalidraw');
    return mod.Excalidraw;
  },
  { 
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center">
        <p className="text-muted-foreground">Chargement du tableau blanc...</p>
      </div>
    )
  }
);

// ⚠️ CORRECTION : Définir le type localement
type MainMenuComponent = React.ComponentType<{
  children?: React.ReactNode;
}>;

interface WhiteboardProps {
  sessionId: string;
  onWhiteboardChange: (elements: readonly any[], appState: any, files: any) => void;
  initialElements?: readonly any[];
  initialAppState?: any;
  isController: boolean;
}

// ⚠️ CORRECTION : Utilisation de memo pour éviter les rendus inutiles
export const Whiteboard = memo(function Whiteboard({
  onWhiteboardChange,
  initialElements,
  initialAppState,
  isController,
}: WhiteboardProps) {
  const [excalidrawApi, setExcalidrawApi] = useState<any>(null);
  const { theme, resolvedTheme } = useTheme();
  const [currentTheme, setCurrentTheme] = useState<"light" | "dark">("light");
  // ⚠️ CORRECTION : Utiliser le type local
  const [MainMenu, setMainMenu] = useState<MainMenuComponent | null>(null);
  const [DefaultItems, setDefaultItems] = useState<any>(null);
  const [isExcalidrawReady, setIsExcalidrawReady] = useState(false);
  
  // ⚠️ CORRECTION : Référence pour éviter les cycles de mise à jour
  const lastInitialElements = useRef<readonly any[] | undefined>();
  const lastInitialAppState = useRef<any>();
  // ⚠️ CORRECTION : Ajouter la référence manquante pour lastChangeRef
  const lastChangeRef = useRef<string>('');

  // ⚠️ CORRECTION : Chargement des composants Excalidraw une seule fois
  useEffect(() => {
    let isMounted = true;
    
    const loadExcalidrawComponents = async () => {
      try {
        console.log('🎨 [Whiteboard] Chargement des composants Excalidraw...');
        const excalidrawModule = await import('@excalidraw/excalidraw');
        
        if (isMounted) {
          setCurrentTheme(resolvedTheme === 'dark' ? excalidrawModule.THEME.DARK : excalidrawModule.THEME.LIGHT);
          // ⚠️ CORRECTION : Pas besoin de wrapper dans une fonction
          setMainMenu(() => excalidrawModule.MainMenu);
          setDefaultItems(excalidrawModule.MainMenu.DefaultItems);
          setIsExcalidrawReady(true);
          console.log('✅ [Whiteboard] Composants Excalidraw chargés');
        }
      } catch (error) {
        console.error('❌ [Whiteboard] Erreur lors du chargement des composants:', error);
      }
    };

    loadExcalidrawComponents();

    return () => {
      isMounted = false;
    };
  }, [resolvedTheme]); // ⚠️ CORRECTION : Utilisation de resolvedTheme au lieu de theme

  // ⚠️ CORRECTION : Mise à jour optimisée des données initiales
  useEffect(() => {
    if (!excalidrawApi || !initialElements) return;

    const elementsChanged = JSON.stringify(initialElements) !== JSON.stringify(lastInitialElements.current);
    const appStateChanged = JSON.stringify(initialAppState) !== JSON.stringify(lastInitialAppState.current);

    if (elementsChanged || appStateChanged) {
      console.log('🖼️ [Whiteboard] Mise à jour de la scène avec nouvelles données');
      
      excalidrawApi.updateScene({ 
        elements: initialElements,
        appState: initialAppState
      });

      lastInitialElements.current = initialElements;
      lastInitialAppState.current = initialAppState;
    }
  }, [initialElements, initialAppState, excalidrawApi]);

  // ⚠️ CORRECTION : Gestion plus stricte des changements avec protection anti-boucle
  const handleOnChange = useCallback(
    (elements: readonly any[], appState: any, files: any) => {
      if (!isController) {
        console.log('🚫 [Whiteboard] Changement ignoré (mode vue seule)');
        return;
      }

      // ⚠️ CORRECTION : Vérifier si les données ont vraiment changé
      const currentData = { elements, appState };
      const currentJSON = JSON.stringify(currentData);
      
      if (currentJSON === lastChangeRef.current) {
        console.log('🔄 [Whiteboard] Changement identique, skip');
        return;
      }
      
      lastChangeRef.current = currentJSON;

      console.log('✍️ [Whiteboard] Changement détecté, appel de onWhiteboardChange');
      
      if (elements && appState) {
        onWhiteboardChange(elements, appState, files);
      }
    },
    [isController, onWhiteboardChange]
  );

  // ⚠️ CORRECTION : Gestion stable de l'API ref
  const handleExcalidrawAPI = useCallback((api: any) => {
    if (api && api !== excalidrawApi) {
      console.log('🎯 [Whiteboard] API Excalidraw initialisée');
      setExcalidrawApi(api);
    }
  }, [excalidrawApi]);

  // ⚠️ CORRECTION : Rendu simplifié du menu
  const renderMainMenu = useCallback(() => {
    if (!MainMenu || !DefaultItems || !isController) return null;
    
    return (
      <MainMenu>
        <DefaultItems.ClearCanvas />
        <DefaultItems.SaveAsImage />
        <DefaultItems.ChangeCanvasBackground />
      </MainMenu>
    );
  }, [MainMenu, DefaultItems, isController]);

  console.log(`🔄 [Whiteboard] Rendu - Contrôleur: ${isController}, Prêt: ${isExcalidrawReady}`);

  // ⚠️ CORRECTION : Éviter le rendu pendant le chargement
  if (!isExcalidrawReady) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Chargement du tableau blanc...</p>
          <div className="mt-2 w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <Excalidraw
        excalidrawAPI={handleExcalidrawAPI}
        theme={currentTheme}
        initialData={{
          elements: initialElements || [],
          appState: initialAppState || {},
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
});