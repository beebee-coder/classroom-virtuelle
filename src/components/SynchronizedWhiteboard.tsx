
'use client';

import { Whiteboard } from './Whiteboard';
import { ExcalidrawScene } from '@/types';
import { useEffect } from 'react';

interface SynchronizedWhiteboardProps {
  sessionId: string;
  whiteboardControllerId: string | null;
  currentUserId: string;
  initialScene?: ExcalidrawScene | null;
  onPersist: (scene: ExcalidrawScene) => void;
}

export function SynchronizedWhiteboard({
  sessionId,
  whiteboardControllerId,
  currentUserId,
  initialScene,
  onPersist
}: SynchronizedWhiteboardProps) {

  const isController = currentUserId === whiteboardControllerId;

  console.log(`🔄 [SyncWB] Rendu. estContrôleur: ${isController}. Scène initiale fournie: ${!!initialScene}`);
  
  useEffect(() => {
    console.log('🖼️ [SyncWB] useEffect: La scène initiale a changé.', initialScene ? 'Données présentes' : 'Données absentes');
  }, [initialScene]);

  const handleWhiteboardChange = (elements: readonly any[], appState: any) => {
    console.log('✍️ [SyncWB] handleWhiteboardChange: Changement détecté sur le tableau blanc.');
    onPersist({ elements, appState });
  }

  return (
    <div className="h-full w-full relative">
      <Whiteboard
        sessionId={sessionId}
        onWhiteboardChange={handleWhiteboardChange}
        initialElements={initialScene?.elements}
        initialAppState={initialScene?.appState}
        isController={isController}
      />
    </div>
  );
}
