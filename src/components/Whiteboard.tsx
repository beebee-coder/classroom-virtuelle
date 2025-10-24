// src/components/Whiteboard.tsx
'use client';
import { Tldraw } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';

export function Whiteboard() {
  return (
    <div className="h-full w-full">
      <Tldraw>
        {/* 
          Pour l'instant, c'est un tableau blanc local.
          La synchronisation en temps réel sera ajoutée dans une prochaine étape.
        */}
      </Tldraw>
    </div>
  );
}
