// src/components/SynchronizedWhiteboard.tsx
'use client';

import { TLEditorSnapshot } from '@tldraw/tldraw';
import { Whiteboard } from './Whiteboard';
import { useWhiteboardSync } from '@/hooks/useWhiteboardSync'; // Utilisation du hook centralisé

interface SynchronizedWhiteboardProps {
  sessionId: string;
  whiteboardControllerId: string | null;
  currentUserId: string;
  initialSnapshot?: TLEditorSnapshot | null;
}

export function SynchronizedWhiteboard({
  sessionId,
  whiteboardControllerId,
  currentUserId,
  initialSnapshot
}: SynchronizedWhiteboardProps) {
  
  // Utilisation du hook simplifié qui gère toute la logique de synchronisation
  const { whiteboardSnapshot, persistWhiteboardSnapshot } = useWhiteboardSync(
    sessionId,
    initialSnapshot ?? null
  );

  return (
    <div className="h-full w-full relative">
      <Whiteboard
        sessionId={sessionId}
        onWhiteboardPersist={persistWhiteboardSnapshot}
        whiteboardSnapshot={whiteboardSnapshot}
        whiteboardControllerId={whiteboardControllerId}
        currentUserId={currentUserId}
      />
    </div>
  );
}
