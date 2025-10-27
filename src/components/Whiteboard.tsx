// src/components/Whiteboard.tsx
'use client';
import { Tldraw, useEditor, TLEditorSnapshot } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import { useEffect } from 'react';

interface WhiteboardProps {
  sessionId: string;
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

    useEffect(() => {
      // Mettre à jour l'état de lecture seule chaque fois que `isController` change
      editor.updateInstanceState({ isReadonly: !isController });
    }, [isController, editor]);

    // Charger le snapshot initial ou les mises à jour
    useEffect(() => {
        if (initialSnapshot) {
            try {
                // Pour éviter de recharger le snapshot que l'on vient de créer,
                // on peut comparer les ID de document.
                const currentDocumentId = editor.store.get('document:document')!.id;
                const newDocumentId = initialSnapshot.store['document:document'].id;

                if (currentDocumentId !== newDocumentId) {
                    editor.loadSnapshot(initialSnapshot);
                }
            } catch (e) {
                console.error("Erreur lors du chargement du snapshot:", e);
            }
        }
    }, [editor, initialSnapshot]);
    
    // Écouter les changements locaux si l'utilisateur est le contrôleur
    useEffect(() => {
        if (isController && onPersist) {
            const handleChange = () => {
                const snapshot = editor.getSnapshot();
                onPersist(snapshot);
            };
            const debouncedHandleChange = debounce(handleChange, 200); // Latence de 200ms
            const unsubscribe = editor.store.listen(debouncedHandleChange, {
              scope: 'document',
              source: 'user'
            });
            return () => unsubscribe();
        }
    }, [editor, onPersist, isController]);

    return null;
}

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
        key={`${sessionId}-${isController}`} // Forcer le re-render si le statut de contrôleur change
        persistenceKey={`session_whiteboard_${sessionId}`}
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
