// src/app/session/[id]/page.tsx - VERSION CORRIGÉE
import { Suspense } from 'react';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from 'next/navigation';
import SessionLoading from '@/components/SessionLoading';
import { type User, type ClassroomWithDetails, Role, type DocumentInHistory } from '@/types';
import prisma from '@/lib/prisma';
import dynamic from 'next/dynamic';

// CORRECTION: Import du composant Button manquant
import { Button } from '@/components/ui/button';

// CORRECTION: Import dynamique AVEC gestion d'erreur améliorée
const SessionClient = dynamic(() => import('@/components/SessionClient'), {
    ssr: false,
    loading: () => (
        <div className="h-screen flex flex-col">
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
}

// CORRECTION: Composant de fallback avec gestion de reconnexion améliorée
function SessionErrorFallback({ sessionId, error }: { sessionId: string; error: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-destructive mb-4">
          Erreur de Session
        </h1>
        <p className="text-muted-foreground mb-2">
          Impossible de charger la session <strong>{sessionId}</strong>
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          {error}
        </p>
        <div className="flex gap-2 justify-center">
          <Button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Réessayer
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              // CORRECTION: Redirection conditionnelle basée sur le rôle
              const role = typeof window !== 'undefined' 
                ? localStorage.getItem('userRole') 
                : null;
              const dashboardUrl = role === 'PROFESSEUR' 
                ? '/teacher/dashboard' 
                : '/student/dashboard';
              window.location.href = dashboardUrl;
            }}
          >
            Retour au tableau de bord
          </Button>
        </div>
      </div>
    </div>
  );
}

// CORRECTION: Fonction de récupération des données avec timeout et meilleure gestion d'erreur
async function fetchSessionData(sessionId: string): Promise<{ data: SessionData | null; error: string | null }> {
    console.log(`[SESSION PAGE] Démarrage fetchSessionData pour la session: ${sessionId}`);
    
    // CORRECTION: Timeout pour éviter les blocages
    const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout lors de la récupération des données')), 10000)
    );

    try {
        const sessionPromise = prisma.coursSession.findUnique({
            where: { id: sessionId },
            include: {
                professeur: true,
                // CORRECTION: Les participants sont directement des User[], pas besoin d'inclure user
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
            },
        });

        const session = await Promise.race([sessionPromise, timeoutPromise]);

        if (!session) {
            console.warn(`[SESSION PAGE] Session ${sessionId} non trouvée`);
            return { data: null, error: 'Session non trouvée' };
        }
        
        // CORRECTION: Vérifier si l'utilisateur a accès à cette session
        const userSession = await getServerSession(authOptions);
        const currentUserId = userSession?.user?.id;
        
        if (!currentUserId) {
            return { data: null, error: 'Utilisateur non authentifié' };
        }

        // CORRECTION: Vérification d'accès corrigée - participants est directement un tableau d'User
        const participantIds = session.participants.map((p: User) => p.id);
        const isParticipant = participantIds.includes(currentUserId) || 
                            session.professeurId === currentUserId;
        
        if (!isParticipant) {
            console.warn(`[SESSION PAGE] Accès refusé pour l'utilisateur ${currentUserId} à la session ${sessionId}`);
            return { data: null, error: 'Accès non autorisé à cette session' };
        }
        
        // Récupérer les documents du professeur
        const teacherDocuments = await prisma.sharedDocument.findMany({
            where: { userId: session.professeurId },
            orderBy: { createdAt: 'desc' },
        });

        // CORRECTION: Les participants sont déjà des User, on les filtre directement
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
        };

        console.log(`✅ [SESSION PAGE] Données de session récupérées avec succès pour: ${sessionId}`);
        console.log(`📊 Détails: ${responsePayload.students.length} élèves, ${responsePayload.participants.length} participants, ${responsePayload.documentHistory.length} documents`);
        return { data: responsePayload, error: null };
    } catch (e: any) {
        console.error("❌ [SESSION PAGE] Erreur critique dans fetchSessionData:", e);
        
        // CORRECTION: Messages d'erreur plus spécifiques
        let errorMessage = 'Échec de la récupération des données';
        if (e.message.includes('Timeout')) {
            errorMessage = 'La récupération des données a pris trop de temps';
        } else if (e.message.includes('prisma') || e.message.includes('database')) {
            errorMessage = 'Erreur de base de données';
        }
        
        return { data: null, error: errorMessage };
    }
}

// CORRECTION: Composant séparé pour la logique de session
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
        />
    );
}

export default async function SessionPage({ params }: { params: { id: string } }) {
  console.log(`[SESSION PAGE] Chargement de la page pour la session: ${params.id}`);
  
  const userSession = await getServerSession(authOptions);

  if (!userSession?.user) {
    console.log(`[SESSION PAGE] Utilisateur non authentifié. Redirection vers /login.`);
    redirect(`/login?callbackUrl=/session/${params.id}`);
  }

  if (!params.id || typeof params.id !== 'string') {
    console.error(`[SESSION PAGE] ID de session invalide: ${params.id}`);
    return <SessionErrorFallback sessionId="invalid" error="ID de session invalide" />;
  }

  try {
    return (
        <div className="h-screen flex flex-col">
            <Suspense fallback={<SessionLoading />}>
                <SessionContent sessionId={params.id} />
            </Suspense>
        </div>
    );
  } catch (error: any) {
    console.error(`[SESSION PAGE] Erreur générale dans SessionPage:`, error);
    return <SessionErrorFallback sessionId={params.id} error={error.message || "Erreur inattendue"} />;
  }
}

// CORRECTION: Génération des métadonnées pour une meilleure SEO
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