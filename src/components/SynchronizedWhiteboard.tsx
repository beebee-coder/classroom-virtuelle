// src/components/SynchronizedWhiteboard.tsx - VERSION CORRIGÉE
'use client';

import { useState, useCallback } from 'react';
import { TLStoreSnapshot } from '@tldraw/tldraw';
import { Whiteboard } from './Whiteboard';
// Supprimez l'import problématique ou corrigez-le
// import { useRedisWhiteboardSync } from '@/hooks/useRedisWhiteboardSync';

interface SynchronizedWhiteboardProps {
  sessionId: string;
  whiteboardControllerId: string | null;
  currentUserId: string;
  initialSnapshot?: TLStoreSnapshot | null;
}

export function SynchronizedWhiteboard({
  sessionId,
  whiteboardControllerId,
  currentUserId,
  initialSnapshot
}: SynchronizedWhiteboardProps) {
  const [currentSnapshot, setCurrentSnapshot] = useState<TLStoreSnapshot | null>(
    initialSnapshot || null
  );

  const handleWhiteboardPersist = useCallback((snapshot: TLStoreSnapshot) => {
    setCurrentSnapshot(snapshot);
    // Ici vous ajouterez la diffusion Redis plus tard
    console.log('📝 Snapshot à diffuser:', snapshot);
  }, []);

  return (
    <div className="h-full w-full relative">
      <Whiteboard
        sessionId={sessionId}
        onWhiteboardPersist={handleWhiteboardPersist}
        whiteboardSnapshot={currentSnapshot}
        whiteboardControllerId={whiteboardControllerId}
        currentUserId={currentUserId}
      />
    </div>
  );
}