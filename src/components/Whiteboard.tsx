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

function WhiteboardEditorLogic({
    onPersist,
    initialSnapshot,
    isController
}: {
    onPersist: (snapshot: TLEditorSnapshot) => void;
    initialSnapshot: TLEditorSnapshot | null;
    isController: boolean;
}) {
    const editor = useEditor();

    useEffect(() => {
        editor.updateInstanceState({ isReadonly: !isController });
    }, [isController, editor]);

    useEffect(() => {
        if (initialSnapshot) {
            // Compare stringified snapshots to avoid re-loading on minor UI changes
            if (JSON.stringify(initialSnapshot) !== JSON.stringify(editor.getSnapshot())) {
                editor.loadSnapshot(initialSnapshot);
            }
        }
    }, [editor, initialSnapshot]);

    useEffect(() => {
        if (!isController) return;

        const handleChange = () => {
            const snapshot = editor.getSnapshot();
            onPersist(snapshot);
        };

        const debouncedHandleChange = debounce(handleChange, 200);

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

  return (
    <div className="h-full w-full flex flex-col">
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
      <div className="flex-1">
        <Tldraw 
          persistenceKey={`session_whiteboard_${sessionId}`}
          forceMobile={false}
          autoFocus={false}
        >
          <WhiteboardEditorLogic 
            onPersist={onWhiteboardPersist}
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
