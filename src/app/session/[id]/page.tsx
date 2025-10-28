// src/app/session/[id]/page.tsx
import { Suspense } from 'react';
import { auth } from "@/auth";
import { redirect } from 'next/navigation';
import SessionClient from '@/components/SessionClient';
import SessionLoading from '@/components/SessionLoading';
import { SessionFallback } from '@/components/SessionFallback';
import type { SessionDetails, ClassroomWithDetails, User, CoursSession, DocumentInHistory } from '@/types';
import prisma from '@/lib/prisma';

// La logique de récupération des données est maintenant directement dans le Server Component
async function fetchSessionData(sessionId: string): Promise<{ data: SessionDetails | null; error: string | null }> {
    console.log(`[SESSION PAGE] Démarrage fetchSessionData pour la session: ${sessionId}`);
    try {
        const session = await prisma.coursSession.findUnique({
            where: { id: sessionId },
            include: {
                professeur: {
                    select: { id: true, name: true, email: true, image: true, role: true }
                },
                classe: {
                    select: { id: true, nom: true, eleves: true } // Inclure les élèves de la classe
                },
                participants: {
                    select: { 
                        id: true, 
                        name: true, 
                        email: true,
                        role: true,
                        image: true,
                        ambition: true,
                        points: true,
                    }
                },
                documentHistory: {
                    take: 10,
                    orderBy: { createdAt: 'desc' }
                }
            },
        });

        if (!session) {
            return { data: null, error: 'Session non trouvée' };
        }

        const responsePayload = {
            id: session.id,
            teacher: session.professeur as User,
            students: session.participants.filter(p => p.role === 'ELEVE') as User[],
            // Assurer que classroom n'est pas null et a la bonne structure
            classroom: session.classe ? {
                ...session.classe,
                eleves: session.classe.eleves,
            } : null,
            documentHistory: session.documentHistory as DocumentInHistory[],
            startTime: session.startTime.toISOString(),
            endTime: session.endTime ? session.endTime.toISOString() : null,
        };

        console.log(`✅ [SESSION PAGE] Données de session récupérées avec succès pour: ${sessionId}`);
        return { data: responsePayload as SessionDetails, error: null };
    } catch (e: any) {
        console.error("❌ [SESSION PAGE] Erreur critique dans fetchSessionData:", e);
        return { data: null, error: e.message || 'Échec de la récupération des données' };
    }
}


export default async function SessionPage({ params }: { params: { id: string } }) {
  const userSession = await auth();

  if (!userSession?.user) {
    redirect(`/login?callbackUrl=/session/${params.id}`);
  }

  // Appel direct à la fonction de récupération de données, sans passer par une API
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
