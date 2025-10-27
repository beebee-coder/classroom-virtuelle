// src/components/Whiteboard.tsx
'use client';
import { Tldraw, useEditor, TLEditorSnapshot } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import { useEffect } from 'react';
import { useWhiteboardSync } from '@/hooks/useWhiteboardSync'; // Import du hook

interface WhiteboardProps {
  sessionId: string;
  isTeacher: boolean; // Pour savoir si c'est le prof
  // Les autres props sont maintenant gérées par le hook
  onWhiteboardPersist: (snapshot: TLEditorSnapshot) => void;
  whiteboardSnapshot: TLEditorSnapshot | null;
  whiteboardControllerId: string | null;
  currentUserId: string;
}

// Composant interne pour gérer la logique de l'éditeur
function EditorManager({ onPersist, initialSnapshot, isController }: { 
    onPersist: (snapshot: TLEditorSnapshot) => void,
    initialSnapshot: TLEditorSnapshot | null,
    isController: boolean
}) {
    const editor = useEditor();

    // Effet pour charger le snapshot initial et mettre l'éditeur en lecture seule si besoin
    useEffect(() => {
        const handleMount = () => {
            if (initialSnapshot) {
                try {
                    editor.loadSnapshot(initialSnapshot);
                } catch (e) {
                    console.error("Erreur lors du chargement du snapshot:", e);
                }
            }
            editor.updateInstanceState({ isReadonly: !isController });
        };
        editor.on('mount', handleMount);
        return () => { editor.off('mount', handleMount); };
    }, [editor, initialSnapshot, isController]);
    
    // Effet pour écouter les changements et persister si on est le contrôleur
    useEffect(() => {
        if (isController && onPersist) {
            const handleChange = () => {
                const snapshot = editor.getSnapshot();
                onPersist(snapshot);
            };
            const debouncedHandleChange = debounce(handleChange, 100); // Latence de 100ms
            const unsubscribe = editor.store.listen(debouncedHandleChange, {
              scope: 'document',
              source: 'user'
            });
            return () => unsubscribe();
        }
    }, [editor, onPersist, isController]);

    return null;
}

// Le composant Whiteboard utilise maintenant le hook et passe les données à l'EditorManager
export function Whiteboard({ 
    sessionId, 
    onWhiteboardPersist,
    whiteboardSnapshot,
    whiteboardControllerId,
    currentUserId,
}: WhiteboardProps) {
  const isController = currentUserId === whiteboardControllerId;

  return (
    <div className="h-full w-full">
      <Tldraw 
        key={sessionId} // Forcer le re-render si la session change
        persistenceKey={`whiteboard-${sessionId}`}
        forceMobile={false}
      >
        <EditorManager 
          onPersist={onWhiteboardPersist}
          initialSnapshot={whiteboardSnapshot}
          isController={isController}
        />
      </Tldraw>
    </div>
  );
}

// Fonction utilitaire pour le debouncing
function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null;
  return function(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}
