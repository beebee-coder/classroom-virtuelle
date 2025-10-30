// src/components/Whiteboard.tsx - VERSION CORRIGÉE AVEC API ACTUELLE
'use client';
import { Tldraw, useEditor, TLStoreSnapshot, TLRecord, useLocalStorageState } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import { useEffect, useCallback, useState } from 'react';

interface WhiteboardProps {
  sessionId: string;
  onWhiteboardPersist: (snapshot: TLStoreSnapshot) => void;
  whiteboardSnapshot: TLStoreSnapshot | null;
  whiteboardControllerId: string | null;
  currentUserId: string;
}

// Composant interne pour gérer la logique de l'éditeur
function EditorManager({ 
  onPersist, 
  initialSnapshot, 
  isController 
}: { 
  onPersist: (snapshot: TLStoreSnapshot) => void;
  initialSnapshot: TLStoreSnapshot | null;
  isController: boolean;
}) {
  const editor = useEditor();
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);

  // Gestion du mode lecture seule
  useEffect(() => {
    editor.updateInstanceState({ isReadonly: !isController });
  }, [isController, editor]);

  // Charger le snapshot initial UNE SEULE FOIS
  useEffect(() => {
    if (initialSnapshot && !hasLoadedInitial && editor && editor.store) {
      try {
        console.log('🎨 [WHITEBOARD] Chargement du snapshot initial');
        
        // CORRECTION: Utiliser store.load()
        if (typeof editor.store.load === 'function') {
          editor.store.load(initialSnapshot);
        } else {
           // Fallback si l'API change encore
          const records = Object.values(initialSnapshot.store) as TLRecord[];
          editor.store.mergeRemoteChanges(() => {
            editor.store.clear();
            editor.store.put(records);
          });
        }
        
        setHasLoadedInitial(true);
      } catch (error) {
        console.error('❌ [WHITEBOARD] Erreur lors du chargement du snapshot:', error);
        setHasLoadedInitial(true); // Éviter les boucles infinies
      }
    }
  }, [editor, initialSnapshot, hasLoadedInitial]);

  // Écouter les changements et persister
  useEffect(() => {
    if (!isController) return;

    const handleChange = () => {
      try {
        // CORRECTION: Utiliser store.get()
        const snapshot = editor.store.get();
        onPersist(snapshot);
      } catch (error) {
        console.error('❌ [WHITEBOARD] Erreur lors de la création du snapshot:', error);
      }
    };

    const debouncedHandleChange = debounce(handleChange, 500);

    const unsubscribe = editor.store.listen(debouncedHandleChange, {
      scope: 'document',
    });

    return () => unsubscribe();
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

  const handlePersist = useCallback((snapshot: TLStoreSnapshot) => {
    console.log('💾 [WHITEBOARD] Persistance du snapshot');
    onWhiteboardPersist(snapshot);
  }, [onWhiteboardPersist]);

  return (
    <div className="h-full w-full flex flex-col">
      {/* En-tête avec statut */}
      <div className="flex items-center justify-between p-2 bg-gray-50 border-b">
        <div className="text-sm font-medium">
          Tableau Blanc {isController ? '🎨 (Contrôleur)' : '👀 (Observateur)'}
        </div>
        <div className={`px-2 py-1 rounded text-xs ${
          isController ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
        }`}>
          {isController ? 'Mode Édition' : 'Mode Lecture'}
        </div>
      </div>

      <div className="flex-1" key={`whiteboard-${sessionId}-${isController}`}>
        <Tldraw 
          persistenceKey={`session_whiteboard_${sessionId}`}
          forceMobile={false}
          autoFocus={false}
          onMount={(editor) => {
            console.log('🎨 [WHITEBOARD] Éditeur Tldraw monté');
            editor.updateInstanceState({ isReadonly: !isController });
          }}
        >
          <EditorManager 
            onPersist={handlePersist}
            initialSnapshot={whiteboardSnapshot}
            isController={isController}
          />
        </Tldraw>
      </div>
    </div>
  );
}

function debounce<T extends (...args: any[]) => void>(
  func: T, 
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
