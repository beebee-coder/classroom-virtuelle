// src/components/Whiteboard.tsx
'use client';
import { Tldraw, useEditor, Editor, getSnapshot, TLStoreSnapshot } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import { useEffect, useState } from 'react';

interface WhiteboardProps {
  sessionId: string;
  initialSnapshot?: TLStoreSnapshot;
  isReadOnly?: boolean;
  onPersist?: (snapshot: TLStoreSnapshot) => void;
}

// Composant interne pour gérer la logique de l'éditeur
function EditorManager({ onPersist, initialSnapshot, isReadOnly }: Omit<WhiteboardProps, 'sessionId'>) {
    const editor = useEditor();

    useEffect(() => {
        // Charger le snapshot initial s'il existe
        if (initialSnapshot) {
            editor.store.loadSnapshot(initialSnapshot);
        }

        let lastPersistedState: string | null = null;
        if (onPersist) {
            // Créer une fonction de rappel qui se déclenchera à chaque changement
            const handleChange = () => {
                // Obtenir un instantané de l'état actuel
                const snapshot = editor.store.getSnapshot();
                const jsonSnapshot = JSON.stringify(snapshot);

                // Ne persister que si l'état a réellement changé
                if (lastPersistedState !== jsonSnapshot) {
                    console.log('🎨 [Whiteboard] - Le professeur a fait une mise à jour, envoi des données...');
                    onPersist(snapshot);
                    lastPersistedState = jsonSnapshot;
                }
            };

            // S'abonner aux changements du store, avec une temporisation (debounce)
            const debouncedHandleChange = debounce(handleChange, 500);
            editor.store.listen(debouncedHandleChange);
        }
        
        // Mettre l'éditeur en mode lecture seule si nécessaire
        editor.updateInstanceState({ isReadonly: !!isReadOnly });

    }, [editor, onPersist, initialSnapshot, isReadOnly]);

    return null; // Ce composant ne rend rien, il ne fait que gérer la logique
}


export function Whiteboard({ sessionId, onPersist, initialSnapshot, isReadOnly = false }: WhiteboardProps) {
  return (
    <div className="h-full w-full">
      <Tldraw 
        key={sessionId} 
        persistenceKey={`whiteboard-${sessionId}`}
        // Les props `snapshot` et `onPersist` ne sont plus directement sur Tldraw v2
        // La logique est gérée via le hook `useEditor` dans le composant `EditorManager`
      >
        <EditorManager 
          onPersist={onPersist}
          initialSnapshot={initialSnapshot}
          isReadOnly={isReadOnly}
        />
      </Tldraw>
    </div>
  );
}

// Fonction utilitaire pour la temporisation (debounce)
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
