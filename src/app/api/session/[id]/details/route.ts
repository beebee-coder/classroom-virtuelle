// src/app/api/session/[id]/details/route.ts
import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/session';

// DUMMY DATA
const dummyStudents = [
    { id: 'student1', name: 'Alice', email: 'student1@example.com', role: 'ELEVE', etat: { metier: { nom: 'Astronaute' } } },
    { id: 'student2', name: 'Bob', email: 'student2@example.com', role: 'ELEVE', etat: { metier: null } },
];
const dummyTeacher = { id: 'teacher-id', name: 'Professeur Test', email: 'teacher@example.com', role: 'PROFESSEUR' };

const dummySessions: {[key:string]: any} = {
    'session-123': {
        id: 'session-123',
        participants: [dummyTeacher, ...dummyStudents],
        professeur: dummyTeacher,
        classroom: {
            id: 'classe-a',
            nom: 'Classe 6ème A',
            eleves: dummyStudents
        }
    }
}


export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id;
  console.log(`[API /session/details] - Requête reçue pour la session ID: ${sessionId}`);
  
  const session = await getAuthSession();
  if (!session?.user) {
    console.log('[API /session/details] - Non autorisé, pas de session utilisateur.');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // ---=== DUMMY LOGIC ===---
    // In a real app, you'd fetch from Prisma. Here, we create a dummy session on the fly.
    const coursSession = {
        id: sessionId,
        participants: [dummyTeacher, ...dummyStudents], // Add all for testing
        professeur: dummyTeacher,
        classroom: {
            id: 'classe-a',
            nom: 'Classe 6ème A',
            eleves: dummyStudents
        }
    };
    // ---====================---

    if (!coursSession) {
      console.log(`[API /session/details] - Session ${sessionId} non trouvée.`);
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Security check: only participants can get details
    const isParticipant = coursSession.participants.some((p:any) => p.id === session.user.id);
    
    // In a dummy setup, we bypass this for ease of testing, but log it.
    if (!isParticipant) {
      console.warn(`[API /session/details] - AVERTISSEMENT: L'utilisateur ${session.user.id} n'est pas un participant mais l'accès est autorisé pour la démo.`);
    }
    
    const studentsInClass = coursSession.classroom?.eleves || [];

    const responsePayload = { 
        session: coursSession, 
        students: studentsInClass,
        teacher: coursSession.professeur,
    };
    
    console.log(`[API /session/details] - Envoi de la réponse pour la session ${sessionId}:`, responsePayload);
    return NextResponse.json(responsePayload);

  } catch (error) {
    console.error(`[API /session/details] - Erreur interne du serveur pour la session ${sessionId}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
