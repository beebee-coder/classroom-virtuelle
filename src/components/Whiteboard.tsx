'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState, memo, useRef } from 'react';
import { useTheme } from 'next-themes';

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

interface WhiteboardProps {
  sessionId: string;
  onWhiteboardChange: (elements: readonly any[], appState: any, files: any) => void;
  initialElements?: readonly any[];
  initialAppState?: any;
  isController: boolean;
}

// ⚠️ CORRECTION MAJEURE : Optimisation complète pour éviter les boucles infinies
export const Whiteboard = memo(function Whiteboard({
  sessionId,
  onWhiteboardChange,
  initialElements,
  initialAppState,
  isController,
}: WhiteboardProps) {
  const [excalidrawApi, setExcalidrawApi] = useState<any>(null);
  const { resolvedTheme } = useTheme();
  const [currentTheme, setCurrentTheme] = useState<"light" | "dark">("light");
  const [isExcalidrawReady, setIsExcalidrawReady] = useState(false);
  
  // ⚠️ CORRECTION : Références pour éviter les cycles de mise à jour
  const lastInitialElements = useRef<readonly any[] | undefined>();
  const lastInitialAppState = useRef<any>();
  const lastChangeRef = useRef<string>('');
  const isUpdatingScene = useRef(false);
  const changeTimeoutRef = useRef<NodeJS.Timeout>();

  // ⚠️ CORRECTION : Chargement des composants Excalidraw une seule fois
  useEffect(() => {
    let isMounted = true;
    
    const loadExcalidrawComponents = async () => {
      try {
        console.log('🎨 [Whiteboard] Chargement des composants Excalidraw...');
        const excalidrawModule = await import('@excalidraw/excalidraw');
        
        if (isMounted) {
          setCurrentTheme(resolvedTheme === 'dark' ? excalidrawModule.THEME.DARK : excalidrawModule.THEME.LIGHT);
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
  }, [resolvedTheme]);

  // ⚠️ CORRECTION CRITIQUE : Mise à jour optimisée des données initiales avec protection anti-boucle
  useEffect(() => {
    if (!excalidrawApi || isUpdatingScene.current || !initialElements) return;

    const elementsChanged = JSON.stringify(initialElements) !== JSON.stringify(lastInitialElements.current);
    const appStateChanged = JSON.stringify(initialAppState) !== JSON.stringify(lastInitialAppState.current);

    if (elementsChanged || appStateChanged) {
      console.log('🖼️ [Whiteboard] Mise à jour de la scène avec nouvelles données');
      
      isUpdatingScene.current = true;
      
      excalidrawApi.updateScene({ 
        elements: initialElements,
        appState: initialAppState
      });

      lastInitialElements.current = initialElements;
      lastInitialAppState.current = initialAppState;
      
      // ⚠️ CORRECTION : Réinitialiser le flag après un délai pour éviter les conflits
      setTimeout(() => {
        isUpdatingScene.current = false;
      }, 100);
    }
  }, [initialElements, initialAppState, excalidrawApi]);

  // ⚠️ CORRECTION CRITIQUE : Gestion des changements avec debounce et protection anti-boucle
  const handleOnChange = useCallback(
    (elements: readonly any[], appState: any, files: any) => {
      // Ignorer si nous sommes en train de mettre à jour la scène ou si pas contrôleur
      if (isUpdatingScene.current || !isController) {
        if (!isController) {
          console.log('🚫 [Whiteboard] Changement ignoré (mode vue seule)');
        }
        return;
      }

      // ⚠️ CORRECTION : Debounce pour éviter les appels trop fréquents
      if (changeTimeoutRef.current) {
        clearTimeout(changeTimeoutRef.current);
      }

      changeTimeoutRef.current = setTimeout(() => {
        // Vérifier si les données ont vraiment changé
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
      }, 50); // ⚠️ CORRECTION : Debounce de 50ms
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

  // ⚠️ CORRECTION : Nettoyage des timeouts
  useEffect(() => {
    return () => {
      if (changeTimeoutRef.current) {
        clearTimeout(changeTimeoutRef.current);
      }
    };
  }, []);

  console.log(`🔄 [Whiteboard] Rendu - Contrôleur: ${isController}, Prêt: ${isExcalidrawReady}`);

  // Éviter le rendu pendant le chargement
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
      />
    </div>
  );
});