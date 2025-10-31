'use client';

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

  const isController = currentUserId === whiteboardControllerId;

  return (
    <div className="h-full w-full relative">
      <Whiteboard
        sessionId={sessionId}
        onWhiteboardChange={(elements, appState) => onPersist({ elements, appState })}
        initialElements={initialScene?.elements}
        initialAppState={initialScene?.appState}
        isController={isController}
      />
    </div>
  );
}
