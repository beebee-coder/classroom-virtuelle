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
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionId = params.id;

  try {
    const coursSession = dummySessions[sessionId];

    if (!coursSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Security check: only participants can get details
    const isParticipant = coursSession.participants.some((p:any) => p.id === session.user.id);
    
    // In a dummy setup, we might bypass this for ease of testing
    // if (!isParticipant) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }
    
    const studentsInClass = coursSession.classroom?.eleves || [];

    return NextResponse.json({ 
        session: coursSession, 
        students: studentsInClass,
        teacher: coursSession.professeur,
    });
  } catch (error) {
    console.error(`[API] Error fetching session details for ${sessionId}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
