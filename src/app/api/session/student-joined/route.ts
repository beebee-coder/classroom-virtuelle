import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { SessionManager } from '@/lib/services/session-manager';

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, studentId } = await request.json();

    if (!sessionId || !studentId) {
      return NextResponse.json({ error: 'Session ID and Student ID required' }, { status: 400 });
    }

    // Vérifier que l'étudiant rejoint sa propre session
    if (session.user.id !== studentId && session.user.role !== 'PROFESSEUR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await SessionManager.studentJoined(sessionId, studentId);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ [API] - Error recording student join:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
