// src/app/session/[id]/page.tsx
import { Suspense } from 'react';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from 'next/navigation';
import SessionLoading from '@/components/SessionLoading';
import { type User, type ClassroomWithDetails, Role, type DocumentInHistory, type QuizWithQuestions } from '@/types';
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
  activeQuiz: QuizWithQuestions | null;
}

// ✅ CORRECTION : Composant client pour la gestion des erreurs
function SessionErrorFallback({ sessionId, error }: { sessionId: string; error: string }) {
  'use client';
  
  const handleReload = () => window.location.reload();
  
  const handleGoToDashboard = () => {
    // Essayer de deviner le rôle basé sur une information stockée localement (non critique)
    // ou simplement rediriger vers la page d'accueil si non disponible.
    const lastRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
    const dashboardUrl = lastRole === 'PROFESSEUR' ? '/teacher/dashboard' : '/student/dashboard';
    window.location.href = dashboardUrl || '/';
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
      <div className="bg-card rounded-xl p-6 max-w-md w-full shadow-lg border">
        <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-destructive text-xl font-bold" aria-hidden="true">!</span>
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
          <Button onClick={handleReload} className="w-full sm:w-auto" aria-label="Réessayer de charger la session">
            Réessayer
          </Button>
          <Button variant="outline" onClick={handleGoToDashboard} className="w-full sm:w-auto" aria-label="Retourner à mon tableau de bord">
            Tableau de bord
          </Button>
        </div>
      </div>
    </div>
  );
}

// ✅ CORRECTION : Pré-chargement léger
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

// ✅ CORRECTION : Composant de chargement enrichi
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


// ✅ CORRECTION : Fonction de récupération de données refactorisée et sécurisée
async function fetchSessionData(sessionId: string, userId: string): Promise<{ data: SessionData | null; error: string | null }> {
    console.log(`[SESSION PAGE] 🚀 Démarrage fetchSessionData pour: ${sessionId}, utilisateur: ${userId}`);
    
    try {
        const session = await prisma.coursSession.findUnique({
            where: { id: sessionId },
            include: {
                professeur: true,
                participants: { select: { id: true } }, // On ne récupère que les ID pour la vérification
                classe: {
                    include: {
                        eleves: {
                            include: { etat: { include: { metier: true } } }
                        }
                    }
                },
                activeQuiz: {
                    include: { questions: { include: { options: true } } }
                }
            },
        });

        if (!session) {
            return { data: null, error: 'Session non trouvée' };
        }

        // ✅ CORRECTION : Vérification des autorisations AVANT de tout charger
        const isParticipant = session.participants.some(p => p.id === userId) || session.professeurId === userId;
        if (!isParticipant) {
            return { data: null, error: 'Accès non autorisé à cette session' };
        }

        // Si l'utilisateur est autorisé, on récupère les données complètes des participants
        const fullParticipants = await prisma.user.findMany({
            where: {
                id: { in: session.participants.map(p => p.id) }
            }
        });

        const teacherDocuments = await prisma.sharedDocument.findMany({
            where: { userId: session.professeurId },
            orderBy: { createdAt: 'desc' },
        });

        const serializableDocumentHistory: DocumentInHistory[] = teacherDocuments.map(doc => ({
            ...doc,
            createdAt: doc.createdAt.toISOString(),
            sharedBy: session.professeur.name || 'Professeur',
            coursSessionId: session.id,
        }));

        const responsePayload: SessionData = {
            id: session.id,
            teacher: session.professeur as User,
            students: fullParticipants.filter((p: User) => p.role === Role.ELEVE) as User[],
            participants: fullParticipants as User[],
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

        console.log(`[SESSION PAGE] ✅ Données récupérées pour: ${sessionId}`);
        return { data: responsePayload, error: null };
    } catch (e: any) {
        console.error("❌ [SESSION PAGE] Erreur critique dans fetchSessionData:", e);
        return { data: null, error: 'Échec de la récupération des données de la session' };
    }
}

// ✅ CORRECTION : Le composant serveur qui gère le flux de données
async function SessionContent({ sessionId }: { sessionId: string }) {
    const userSession = await getServerSession(authOptions);
    
    if (!userSession?.user) {
        // Cette redirection est une sécurité, la page principale devrait déjà l'avoir gérée
        redirect(`/login?callbackUrl=/session/${sessionId}`);
    }

    const { data: sessionData, error } = await fetchSessionData(sessionId, userSession.user.id);

    if (error || !sessionData) {
        // On lance une erreur pour qu'elle soit attrapée par le ErrorBoundary de Next.js
        // qui affichera le composant d'erreur de la page.
        throw new Error(error || "Données de session non trouvées");
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

// ✅ CORRECTION : La page principale gère les états de chargement, d'erreur et de succès
export default async function SessionPage({ params }: { params: { id: string } }) {
  console.log(`[SESSION PAGE] 📄 Chargement de la page pour la session: ${params.id}`);
  
  const userSession = await getServerSession(authOptions);

  if (!userSession?.user) {
    redirect(`/login?callbackUrl=/session/${params.id}`);
  }

  if (!params.id || typeof params.id !== 'string') {
    return <SessionErrorFallback sessionId="invalid" error="ID de session invalide" />;
  }

  // Essayer de charger les données et gérer les erreurs
  try {
    const preview = await fetchSessionPreview(params.id);
    
    // Le Suspense gère l'état de chargement en attendant que SessionContent soit prêt
    return (
        <div className="h-screen flex flex-col overflow-hidden">
            <Suspense fallback={<EnrichedSessionLoading preview={preview} />}>
                <SessionContent sessionId={params.id} />
            </Suspense>
        </div>
    );
  } catch (error: any) {
    console.error(`[SESSION PAGE] ❌ Erreur générale interceptée pour la session ${params.id}:`, error);
    // Si une erreur est lancée par SessionContent, on l'affiche ici
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
      return { title: 'Session non trouvée' };
    }

    return {
      title: `Session ${session.classe?.nom || 'Classe'} - ${session.professeur.name}`,
      description: `Session de cours avec ${session.professeur.name}`,
    };
  } catch (error) {
    return { title: 'Session de cours' };
  }
}
