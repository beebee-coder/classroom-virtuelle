// src/components/Whiteboard.tsx
'use client';
import { Tldraw, useEditor, Editor, getSnapshot, TLStoreSnapshot } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import { useEffect } from 'react';

interface WhiteboardProps {
  sessionId: string;
  initialSnapshot?: TLStoreSnapshot;
  isController: boolean; // Nouveau: pour savoir si l'utilisateur actuel a le contrôle
  onPersist?: (snapshot: TLStoreSnapshot) => void;
}

// Composant interne pour gérer la logique de l'éditeur
function EditorManager({ onPersist, initialSnapshot, isController }: Omit<WhiteboardProps, 'sessionId'>) {
    const editor = useEditor();

    useEffect(() => {
        // Appliquer le snapshot initial ou les mises à jour reçues
        if (initialSnapshot) {
            try {
                // Ne charger que si le snapshot est différent pour éviter les re-renders
                const currentSnapshot = getSnapshot(editor.store);
                if (JSON.stringify(currentSnapshot) !== JSON.stringify(initialSnapshot)) {
                   editor.store.loadSnapshot(initialSnapshot);
                }
            } catch (e) {
                console.error("Erreur lors du chargement du snapshot du tableau blanc:", e);
            }
        }
    }, [editor, initialSnapshot]);
    
    useEffect(() => {
        // Mettre à jour le mode lecture/écriture en fonction du contrôle
        editor.updateInstanceState({ isReadonly: !isController });

        // Si l'utilisateur est le contrôleur, on active la persistance
        if (isController && onPersist) {
             let lastPersistedState: string | null = null;
            
            const handleChange = () => {
                const snapshot = getSnapshot(editor.store);
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
