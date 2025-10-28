import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

// Stockage en mémoire temporaire (pour développement)
const memoryStore = new Map();

const WHITEBOARD_SNAPSHOT_KEY = (sessionId: string) => `whiteboard:${sessionId}:snapshot`;

// POST handler for publishing whiteboard updates
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id;
  const session = await auth();

  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 403 });
  }

  try {
    const body = await request.json();
    const { snapshot, senderSocketId } = body;

    if (!snapshot) {
      return new NextResponse('Snapshot data is required', { status: 400 });
    }
    
    // ✅ Stockage en mémoire
    console.log(`💾 [SYNC POST] Stockage snapshot pour session ${sessionId}`);
    memoryStore.set(WHITEBOARD_SNAPSHOT_KEY(sessionId), snapshot);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`💥 [API SYNC] - Erreur pour la session ${sessionId}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// GET handler for retrieving the last known snapshot
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id;
  const session = await auth();

  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 403 });
  }
  
  try {
    // ✅ Récupération depuis la mémoire
    const snapshot = memoryStore.get(WHITEBOARD_SNAPSHOT_KEY(sessionId)) || null;
    console.log(`💾 [SYNC GET] Récupération pour ${sessionId}:`, snapshot ? 'données trouvées' : 'aucune donnée');
    
    // ✅ IMPORTANT: Retourner directement le snapshot (pas d'objet wrapper)
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error(`💥 [API SYNC GET] - Erreur pour la session ${sessionId}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}