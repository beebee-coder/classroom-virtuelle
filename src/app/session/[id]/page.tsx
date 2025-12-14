// src/app/session/[id]/page.tsx
import { Suspense } from 'react';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from 'next/navigation';
import SessionLoading from '@/components/SessionLoading';
import { type User, type ClassroomWithDetails, Role, type DocumentInHistory, type Quiz } from '@/types';
import prisma from '@/lib/prisma';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';

const SessionClient = dynamic(() => import('@/components/SessionClient'), {
    ssr: false,
    loading: () => (
        <div className="h-screen flex flex-col overflow-hidden">
            <SessionLoading />
        </div>
    ),
});

interface SessionData {
  id: string;
  teacher: User;
  students: User[];
  participants: User[];
  classroom: ClassroomWithDetails | null;
  documentHistory: DocumentInHistory[];
  startTime: string;
  endTime: string | null;
  activeQuiz: Quiz | null;
}

function SessionErrorFallback({ sessionId, error }: { sessionId: string; error: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
      <div className="bg-card rounded-xl p-6 max-w-md w-full shadow-lg border">
        <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <span 
            className="text-destructive text-xl font-bold" 
            aria-hidden="true"
          >
            !
          </span>
        </div>
        <h1 className="text-xl font-semibold text-foreground mb-2">
          Impossible de rejoindre la session
        </h1>
        {sessionId !== 'invalid' && (
          <p className="text-sm text-muted-foreground mb-1">
            Session <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{sessionId}</code>
          </p>
        )}
        <p className="text-sm text-muted-foreground mb-4">
          {error}
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button 
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto"
            aria-label="Réessayer de charger la session"
          >
            Réessayer
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const role = typeof window !== 'undefined' 
                ? localStorage.getItem('userRole') 
                : null;
              const dashboardUrl = role === 'PROFESSEUR' 
                ? '/teacher/dashboard' 
                : '/student/dashboard';
              window.location.href = dashboardUrl;
            }}
            className="w-full sm:w-auto"
            aria-label="Retourner à mon tableau de bord"
          >
            Tableau de bord
          </Button>
        </div>
      </div>
    </div>
  );
}

async function fetchSessionPreview(sessionId: string) {
  try {
    const session = await prisma.coursSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        professeur: { select: { name: true } },
        classe: { select: { nom: true } },
      },
    });
    return session;
  } catch {
    return null;
  }
}

function EnrichedSessionLoading({ preview }: { preview: Awaited<ReturnType<typeof fetchSessionPreview>> }) {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="text-center max-w-md px-2">
        <div className="animate-pulse mb-5">
          <div className="w-16 h-16 bg-primary/10 rounded-full mx-auto mb-3" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-1 leading-tight">
          {preview?.classe?.nom 
            ? `Chargement de la session — ${preview.classe.nom}` 
            : 'Chargement de la session en cours'}
        </h2>
        {preview?.professeur?.name && (
          <p className="text-sm text-muted-foreground mt-1">
            Animée par {preview.professeur.name}
          </p>
        )}
        <div className="mt-6">
          <SessionLoading />
        </div>
      </div>
    </div>
  );
}

async function fetchSessionData(sessionId: string): Promise<{ data: SessionData | null; error: string | null }> {
    console.log(`[SESSION PAGE] 🚀 Démarrage fetchSessionData pour la session: ${sessionId}`);
    
    const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout lors de la récupération des données')), 10000)
    );

    try {
        const sessionPromise = prisma.coursSession.findUnique({
            where: { id: sessionId },
            include: {
                professeur: true,
                participants: true,
                classe: {
                    include: {
                        eleves: {
                            include: {
                                etat: {
                                    include: {
                                        metier: true
                                    }
                                }
                            }
                        }
                    }
                },
                activeQuiz: {
                    include: {
                        questions: {
                            include: {
                                options: true,
                            }
                        }
                    }
                }
            },
        });

        const session = await Promise.race([sessionPromise, timeoutPromise]);

        if (!session) {
            console.warn(`[SESSION PAGE] ⚠️ Session ${sessionId} non trouvée`);
            return { data: null, error: 'Session non trouvée' };
        }
        
        const userSession = await getServerSession(authOptions);
        const currentUserId = userSession?.user?.id;
        
        if (!currentUserId) {
            return { data: null, error: 'Utilisateur non authentifié' };
        }

        const participantIds = session.participants.map((p: User) => p.id);
        const isParticipant = participantIds.includes(currentUserId) || 
                            session.professeurId === currentUserId;
        
        if (!isParticipant) {
            console.warn(`[SESSION PAGE] 🚫 Accès refusé pour l'utilisateur ${currentUserId} à la session ${sessionId}`);
            return { data: null, error: 'Accès non autorisé à cette session' };
        }
        
        const teacherDocuments = await prisma.sharedDocument.findMany({
            where: { userId: session.professeurId },
            orderBy: { createdAt: 'desc' },
        });

        const students = session.participants.filter((p: User) => p.role === Role.ELEVE);

        const serializableDocumentHistory: DocumentInHistory[] = teacherDocuments.map(doc => ({
            ...doc,
            createdAt: doc.createdAt.toISOString(),
            sharedBy: session.professeur.name || 'Professeur',
            coursSessionId: session.id,
        }));

        const responsePayload: SessionData = {
            id: session.id,
            teacher: session.professeur as User,
            students: students as User[],
            participants: session.participants as User[],
            classroom: session.classe ? {
                ...session.classe,
                eleves: session.classe.eleves as any[],
            } as ClassroomWithDetails : null,
            documentHistory: serializableDocumentHistory,
            startTime: session.startTime.toISOString(),
            endTime: session.endTime ? session.endTime.toISOString() : null,
            activeQuiz: session.activeQuiz ? {
                ...session.activeQuiz,
                questions: session.activeQuiz.questions.map(q => ({
                    ...q,
                    options: q.options
                }))
            } : null,
        };

        console.log(`[SESSION PAGE] ✅ Données de session récupérées avec succès pour: ${sessionId}`);
        console.log(`[SESSION PAGE] 📊 Détails: ${responsePayload.students.length} élèves, ${responsePayload.participants.length} participants, ${responsePayload.documentHistory.length} documents, Quiz actif: ${!!responsePayload.activeQuiz}`);
        return { data: responsePayload, error: null };
    } catch (e: any) {
        console.error("❌ [SESSION PAGE] Erreur critique dans fetchSessionData:", e);
        
        let errorMessage = 'Échec de la récupération des données';
        if (e.message.includes('Timeout')) {
            errorMessage = 'La récupération des données a pris trop de temps';
        } else if (e.message.includes('prisma') || e.message.includes('database')) {
            errorMessage = 'Erreur de base de données';
        }
        
        return { data: null, error: errorMessage };
    }
}

async function SessionContent({ sessionId }: { sessionId: string }) {
    const { data: sessionData, error } = await fetchSessionData(sessionId);

    if (error || !sessionData) {
        throw new Error(error || "Données de session non trouvées");
    }

    const userSession = await getServerSession(authOptions);
    
    if (!userSession?.user) {
        redirect(`/login?callbackUrl=/session/${sessionId}`);
    }

    return (
        <SessionClient
            sessionId={sessionData.id}
            initialStudents={sessionData.students}
            initialTeacher={sessionData.teacher}
            currentUserId={userSession.user.id}
            currentUserRole={userSession.user.role as Role}
            classroom={sessionData.classroom}
            initialDocumentHistory={sessionData.documentHistory}
            initialActiveQuiz={sessionData.activeQuiz}
        />
    );
}

export default async function SessionPage({ params }: { params: { id: string } }) {
  console.log(`[SESSION PAGE] 📄 Chargement de la page pour la session: ${params.id}`);
  
  const userSession = await getServerSession(authOptions);

  if (!userSession?.user) {
    console.log(`[SESSION PAGE] 🚫 Utilisateur non authentifié. Redirection vers /login.`);
    redirect(`/login?callbackUrl=/session/${params.id}`);
  }

  if (!params.id || typeof params.id !== 'string') {
    console.error(`[SESSION PAGE] ❌ ID de session invalide: ${params.id}`);
    return <SessionErrorFallback sessionId="invalid" error="ID de session invalide" />;
  }

  const preview = await fetchSessionPreview(params.id);

  try {
    return (
        // 🔧 Ajout de overflow-hidden pour garantir le comportement plein écran
        <div className="h-screen flex flex-col overflow-hidden">
            <Suspense fallback={<EnrichedSessionLoading preview={preview} />}>
                <SessionContent sessionId={params.id} />
            </Suspense>
        </div>
    );
  } catch (error: any) {
    console.error(`[SESSION PAGE] ❌ Erreur générale dans SessionPage:`, error);
    return <SessionErrorFallback sessionId={params.id} error={error.message || "Erreur inattendue"} />;
  }
}

export async function generateMetadata({ params }: { params: { id: string } }) {
  try {
    const session = await prisma.coursSession.findUnique({
      where: { id: params.id },
      include: {
        professeur: true,
        classe: true,
      },
    });

    if (!session) {
      return {
        title: 'Session non trouvée',
      };
    }

    return {
      title: `Session ${session.classe?.nom || 'Classe'} - ${session.professeur.name}`,
      description: `Session de cours avec ${session.professeur.name}`,
    };
  } catch (error) {
    return {
      title: 'Session de cours',
    };
  }
}