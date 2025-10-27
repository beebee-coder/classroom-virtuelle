// src/app/session/[id]/page.tsx
import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { redirect } from 'next/navigation';
import SessionClient from '@/components/SessionClient';
import SessionLoading from '@/components/SessionLoading';
import { SessionFallback } from '@/components/SessionFallback';
import type { SessionDetails, ClassroomWithDetails } from '@/types';

async function fetchSessionData(sessionId: string): Promise<{ data: SessionDetails | null; error: string | null }> {
    console.log(`[SESSION PAGE] Démarrage fetchSessionData pour la session: ${sessionId}`);
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/session/${sessionId}`, {
            cache: 'no-store', // Toujours récupérer les données fraîches pour une session
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ error: `Erreur HTTP ${res.status}` }));
            console.error(`❌ [SESSION PAGE] Erreur lors du fetch (status ${res.status}):`, errorData.error);
            return { data: null, error: errorData.error || `Erreur HTTP ${res.status}` };
        }

        const data = await res.json();
        console.log(`✅ [SESSION PAGE] Données de session récupérées avec succès pour: ${sessionId}`);
        return { data, error: null };
    } catch (e: any) {
        console.error("❌ [SESSION PAGE] Erreur critique dans fetchSessionData:", e);
        return { data: null, error: e.message || 'Échec de la récupération des données' };
    }
}


export default async function SessionPage({ params }: { params: { id: string } }) {
  const userSession = await getServerSession(authOptions);

  if (!userSession?.user) {
    redirect(`/login?callbackUrl=/session/${params.id}`);
  }

  const { data: sessionData, error } = await fetchSessionData(params.id);

  if (error || !sessionData) {
    console.error(`[SESSION PAGE] Affichage du Fallback pour la session ${params.id}. Raison: ${error || "Données de session non trouvées"}`);
    return <SessionFallback sessionId={params.id} error={error || "Données de session non trouvées"} />;
  }

  return (
    <Suspense fallback={<SessionLoading />}>
      <SessionClient
        sessionId={sessionData.id}
        initialStudents={sessionData.students}
        initialTeacher={sessionData.teacher}
        currentUserId={userSession.user.id}
        currentUserRole={userSession.user.role as any}
        classroom={sessionData.classroom as ClassroomWithDetails}
        initialDocumentHistory={sessionData.documentHistory}
      />
    </Suspense>
  );
}
