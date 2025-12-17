// src/app/session/[id]/page.tsx
'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import SessionLoading from '@/components/SessionLoading';

// Le SessionClient gérera maintenant sa propre récupération de données
const SessionClient = dynamic(() => import('@/components/SessionClient'), {
    ssr: false,
    loading: () => <SessionLoading />,
});

// La page est maintenant un simple point d'entrée client
export default function SessionPage({ params }: { params: { id: string } }) {
  console.log(`[SESSION PAGE] 📄 Chargement de la page pour la session: ${params.id}`);
  
  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-background">
      <Suspense fallback={<SessionLoading />}>
        {/* SessionClient récupérera les données et affichera les erreurs si nécessaire */}
        <SessionClient sessionId={params.id} />
      </Suspense>
    </div>
  );
}