import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { ExcalidrawScene } from '@/types';

// Stockage en mémoire temporaire (pour développement)
const memoryStore = new Map<string, ExcalidrawScene>();

const WHITEBOARD_SCENE_KEY = (sessionId: string) => `whiteboard:${sessionId}:scene`;

// POST handler for publishing whiteboard updates
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id;
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 403 });
  }

  try {
    const body = await request.json();
    const { sceneData } = body;

    if (!sceneData) {
      return new NextResponse('Scene data is required', { status: 400 });
    }
    
    // Stockage en mémoire
    console.log(`💾 [SYNC POST] Stockage de la scène pour session ${sessionId}`);
    memoryStore.set(WHITEBOARD_SCENE_KEY(sessionId), sceneData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`💥 [API SYNC] - Erreur pour la session ${sessionId}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// GET handler for retrieving the last known scene
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id;
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 403 });
  }
  
  try {
    // Récupération depuis la mémoire
    const scene = memoryStore.get(WHITEBOARD_SCENE_KEY(sessionId)) || null;
    console.log(`💾 [SYNC GET] Récupération pour ${sessionId}:`, scene ? 'données trouvées' : 'aucune donnée');
    
    return NextResponse.json(scene);
  } catch (error) {
    console.error(`💥 [API SYNC GET] - Erreur pour la session ${sessionId}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
