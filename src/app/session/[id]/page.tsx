// src/app/session/[id]/page.tsx - VERSION CORRIGÉE

import { Suspense } from 'react';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from 'next/navigation';
import SessionLoading from '@/components/SessionLoading';
import { type User, type ClassroomWithDetails, Role, type DocumentInHistory } from '@/types';
import prisma from '@/lib/prisma';
import dynamic from 'next/dynamic';

// CORRECTION: Import dynamique AVEC Suspense intégré pour éviter les re-rendus multiples
const SessionClient = dynamic(() => import('@/components/SessionClient'), {
    ssr: false,
    loading: () => <SessionLoading />, // CORRECTION: Le loading est géré par dynamic()
});

// Le type pour les données de session, en utilisant DocumentInHistory du fichier de types central
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

// Composant de fallback simple
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
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}

// Fonction de récupération des données avec la structure correcte du schéma
async function fetchSessionData(sessionId: string): Promise<{ data: SessionData | null; error: string | null }> {
    console.log(`[SESSION PAGE] Démarrage fetchSessionData pour la session: ${sessionId}`);
    try {
        const session = await prisma.coursSession.findUnique({
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
            },
        });

        if (!session) {
            return { data: null, error: 'Session non trouvée' };
        }
        
        // CORRECTION: Récupérer les documents du professeur séparément
        const teacherDocuments = await prisma.sharedDocument.findMany({
            where: { userId: session.professeurId },
            orderBy: { createdAt: 'desc' },
        });

        const serializableDocumentHistory: DocumentInHistory[] = teacherDocuments.map(doc => ({
            ...doc,
            createdAt: doc.createdAt.toISOString(),
            sharedBy: session.professeur.name || 'Professeur',
            coursSessionId: session.id, // Garder une référence pour le contexte, même si non stocké
        }));


        const responsePayload: SessionData = {
            id: session.id,
            teacher: session.professeur as User,
            students: session.participants.filter(p => p.role === Role.ELEVE) as User[],
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
        return { data: null, error: e.message || 'Échec de la récupération des données' };
    }
}

export default async function SessionPage({ params }: { params: { id: string } }) {
  console.log(`[SESSION PAGE] Chargement de la page pour la session: ${params.id}`);
  
  try {
    const userSession = await getServerSession(authOptions);

    if (!userSession?.user) {
      console.log(`[SESSION PAGE] Utilisateur non authentifié. Redirection vers /login.`);
      redirect(`/login?callbackUrl=/session/${params.id}`);
    }

    if (!params.id || typeof params.id !== 'string') {
      console.error(`[SESSION PAGE] ID de session invalide: ${params.id}`);
      return <SessionErrorFallback sessionId="invalid" error="ID de session invalide" />;
    }

    const { data: sessionData, error } = await fetchSessionData(params.id);

    if (error || !sessionData) {
      console.error(`[SESSION PAGE] Affichage du Fallback pour la session ${params.id}. Raison: ${error || "Données de session non trouvées"}`);
      return <SessionErrorFallback sessionId={params.id} error={error || "Données de session non trouvées"} />;
    }

    console.log(`[SESSION PAGE] Données prêtes. Rendu de SessionClient pour l'utilisateur ${userSession.user.id} (${userSession.user.role}).`);
    
    const currentUserRole = userSession.user.role as Role;
    
    return (
        <div className="h-screen flex flex-col">
            {/* CORRECTION: Retirer le Suspense externe car il est déjà géré par dynamic() */}
            <SessionClient
              sessionId={sessionData.id}
              initialStudents={sessionData.students}
              initialTeacher={sessionData.teacher}
              currentUserId={userSession.user.id}
              currentUserRole={currentUserRole}
              classroom={sessionData.classroom}
              initialDocumentHistory={sessionData.documentHistory}
            />
        </div>
    );
  } catch (error: any) {
    console.error(`[SESSION PAGE] Erreur générale dans SessionPage:`, error);
    return <SessionErrorFallback sessionId={params.id} error={error.message || "Erreur inattendue"} />;
  }
}
