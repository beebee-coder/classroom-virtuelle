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
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/session/${sessionId}`, {
            cache: 'no-store', // Toujours récupérer les données fraîches pour une session
        });

        if (!res.ok) {
            const errorData = await res.json();
            return { data: null, error: errorData.error || `HTTP error ${res.status}` };
        }

        const data = await res.json();
        return { data, error: null };
    } catch (e: any) {
        console.error("❌ Erreur fetchSessionData:", e.message);
        return { data: null, error: e.message || 'Failed to fetch' };
    }
}


export default async function SessionPage({ params }: { params: { id: string } }) {
  const userSession = await getServerSession(authOptions);

  if (!userSession?.user) {
    redirect(`/login?callbackUrl=/session/${params.id}`);
  }

  const { data: sessionData, error } = await fetchSessionData(params.id);

  if (error || !sessionData) {
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
