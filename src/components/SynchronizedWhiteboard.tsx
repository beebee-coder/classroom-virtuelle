// src/components/SynchronizedWhiteboard.tsx
'use client';

import { useState, useCallback } from 'react';
import type { ExcalidrawElement, AppState, BinaryFiles, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/data/types';
import { Whiteboard } from './Whiteboard';
import { ExcalidrawScene } from '@/types';


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

  const handleWhiteboardChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
        onPersist({ elements, appState });
    },
    [onPersist]
  );
  
  const isController = currentUserId === whiteboardControllerId;

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
