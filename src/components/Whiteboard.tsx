// src/components/Whiteboard.tsx
'use client';
import { Tldraw, useEditor, Editor, getSnapshot, TLEditorSnapshot } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import { useEffect } from 'react';

interface WhiteboardProps {
  sessionId: string;
  initialSnapshot?: TLEditorSnapshot;
  isController: boolean; // Nouveau: pour savoir si l'utilisateur actuel a le contrôle
  onPersist?: (snapshot: TLEditorSnapshot) => void;
}

// Composant interne pour gérer la logique de l'éditeur
function EditorManager({ onPersist, initialSnapshot, isController }: Omit<WhiteboardProps, 'sessionId'>) {
    const editor = useEditor();

    useEffect(() => {
        // Attendre que l'éditeur soit complètement monté avant de charger un snapshot.
        const handleMount = () => {
            if (initialSnapshot) {
                try {
                    editor.loadSnapshot(initialSnapshot);
                } catch (e) {
                    console.error("Erreur lors du chargement du snapshot du tableau blanc:", e);
                }
            }
        };

        editor.on('mount', handleMount);

        return () => {
            editor.off('mount', handleMount);
        };
    }, [editor, initialSnapshot]);
    
    useEffect(() => {
        // Mettre à jour le mode lecture/écriture en fonction du contrôle
        editor.updateInstanceState({ isReadonly: !isController });

        // Si l'utilisateur est le contrôleur, on active la persistance
        if (isController && onPersist) {
             let lastPersistedState: string | null = null;
            
            const handleChange = () => {
                const snapshot = editor.getSnapshot();
                const jsonSnapshot = JSON.stringify(snapshot);

                if (lastPersistedState !== jsonSnapshot) {
                    console.log(`🎨 [Whiteboard] - L'utilisateur contrôleur a fait une mise à jour, envoi des données...`);
                    onPersist(snapshot);
                    lastPersistedState = jsonSnapshot;
                }
            };
            
            const debouncedHandleChange = debounce(handleChange, 300);
            const unsubscribe = editor.store.listen(debouncedHandleChange);

            // Fonction de nettoyage
            return () => unsubscribe();
        }

    }, [editor, onPersist, isController]);


    return null;
}


export function Whiteboard({ sessionId, onPersist, initialSnapshot, isController }: WhiteboardProps) {
  return (
    <div className="h-full w-full">
      <Tldraw 
        key={`${sessionId}-${isController}`} // Change la clé pour forcer le re-render si le contrôle change
        persistenceKey={`whiteboard-${sessionId}`}
        // Ne pas passer le snapshot ici directement pour éviter les problèmes de chargement initial
      >
        <EditorManager 
          onPersist={onPersist}
          initialSnapshot={initialSnapshot}
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
