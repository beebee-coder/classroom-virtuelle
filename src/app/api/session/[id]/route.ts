// src/app/api/session/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { allDummyStudents } from '@/lib/dummy-data';

// Stockage en mémoire pour les sessions de démo
const sessions = new Map<string, { participants: string[] }>();

/**
 * GET: Récupère les détails d'une session spécifique, notamment les participants.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id;
  console.log(`ℹ️ [API SESSION DETAILS] - GET: Recherche de la session: ${sessionId}`);

  const sessionData = sessions.get(sessionId);

  if (!sessionData) {
    console.error(`❌ [API SESSION DETAILS] - Session non trouvée: ${sessionId}`);
    return new NextResponse('Session not found', { status: 404 });
  }

  // Enrichir les IDs avec les données complètes des élèves
  const teacher = { 
      id: 'teacher-id', 
      name: 'Professeur Test', 
      email: 'teacher@example.com', 
      role: 'PROFESSEUR',
  };
  
  const studentsInSession = allDummyStudents.filter(s => sessionData.participants.includes(s.id));

  console.log(`✅ [API SESSION DETAILS] - Session trouvée avec ${studentsInSession.length} élève(s).`);

  return NextResponse.json({
    id: sessionId,
    teacher,
    students: studentsInSession,
  });
}

/**
 * POST: Crée ou met à jour les détails d'une session.
 * Utilisé par l'action `createCoursSession` pour sauvegarder la liste des participants.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id;
  console.log(`💾 [API SESSION DETAILS] - POST: Sauvegarde des détails pour la session ${sessionId}`);
  try {
    const body = await request.json();
    const { participants } = body;

    if (!participants || !Array.isArray(participants)) {
      console.error('❌ [API SESSION DETAILS] - Payload invalide: tableau de participants requis.');
      return new NextResponse('Invalid payload: participants array is required', { status: 400 });
    }

    console.log(`  Sauvegarde de ${participants.length} participant(s) pour la session ${sessionId}.`);
    sessions.set(sessionId, { participants });

    // Auto-nettoyage après un certain temps pour éviter de saturer la mémoire
    setTimeout(() => {
        if (sessions.has(sessionId)) {
            console.log(`🧹 [API SESSION DETAILS] - Nettoyage de l'ancienne session en mémoire: ${sessionId}`);
            sessions.delete(sessionId);
        }
    }, 10 * 60 * 1000); // 10 minutes

    console.log('✅ [API SESSION DETAILS] - Sauvegarde réussie.');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`💥 [API SESSION DETAILS] - Erreur lors de la sauvegarde de la session ${sessionId}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
