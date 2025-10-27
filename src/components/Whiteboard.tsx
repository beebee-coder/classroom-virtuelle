// src/components/Whiteboard.tsx
'use client';
import { Tldraw, useEditor, TLStoreSnapshot, TLRecord } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import { useEffect, useCallback } from 'react';

interface WhiteboardProps {
  sessionId: string;
  onWhiteboardPersist: (snapshot: TLStoreSnapshot) => void;
  whiteboardSnapshot: TLStoreSnapshot | null;
  whiteboardControllerId: string | null;
  currentUserId: string;
}

// Composant interne pour gérer la logique de l'éditeur
// Il est passé en tant qu'enfant de Tldraw pour avoir accès au contexte de l'éditeur.
function WhiteboardEditorLogic({ 
  onPersist, 
  initialSnapshot, 
  isController 
}: { 
  onPersist: (snapshot: TLStoreSnapshot) => void;
  initialSnapshot: TLStoreSnapshot | null;
  isController: boolean;
}) {
  const editor = useEditor();

  // Gestion du mode lecture seule
  useEffect(() => {
    editor.updateInstanceState({ isReadonly: !isController });
  }, [isController, editor]);

  // Charger le snapshot initial
  useEffect(() => {
    if (initialSnapshot && editor) {
      try {
        const currentStoreSnapshot = editor.store.getSnapshot('document');
        if (JSON.stringify(currentStoreSnapshot) !== JSON.stringify(initialSnapshot)) {
          editor.store.loadSnapshot(initialSnapshot);
        }
      } catch (error) {
        console.error("Erreur lors du chargement du snapshot:", error);
      }
    }
  }, [editor, initialSnapshot]);

  // Écouter les changements et persister
  useEffect(() => {
    if (!isController) return;

    const handleChange = () => {
      const snapshot = editor.store.getSnapshot('document');
      onPersist(snapshot);
    };

    const debouncedHandleChange = debounce(handleChange, 200);

    // S'abonner aux changements du store
    const unsubscribe = editor.store.listen(debouncedHandleChange, {
      scope: 'document',
      source: 'user',
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

      {/* Zone de dessin */}
      <div className="flex-1">
        <Tldraw 
          persistenceKey={`session_whiteboard_${sessionId}`}
          forceMobile={false}
          autoFocus={false}
        >
          <WhiteboardEditorLogic 
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
