
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, studentId } = await request.json();

    if (!sessionId || !studentId) {
      return NextResponse.json({ error: 'Session ID and Student ID required' }, { status: 400 });
    }

    // Vérifier que l'étudiant décline sa propre invitation
    if (session.user.id !== studentId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Logique pour enregistrer le refus (optionnel)
    console.log(`📝 [API] - Student ${studentId} declined invitation to session ${sessionId}`);
    
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ [API] - Error declining invitation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

    