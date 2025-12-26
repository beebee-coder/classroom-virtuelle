// src/app/api/session/[id]/whiteboard-controller/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from "@/lib/auth";
import prisma from '@/lib/prisma';
import { ablyTrigger } from '@/lib/ably/triggers';
import { getSessionChannelName } from '@/lib/ably/channels';
import { AblyEvents } from '@/lib/ably/events';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id;
  const session = await getAuthSession();

  // Seul le professeur peut changer le contrôleur
  if (session?.user?.role !== 'PROFESSEUR') {
    console.error(`👑 [API WB-CONTROLLER] Tentative non autorisée par l'utilisateur ${session?.user?.id}`);
    return new NextResponse('Unauthorized', { status: 403 });
  }

  // Vérifier que la session appartient bien à ce professeur
  const sessionRecord = await prisma.coursSession.findFirst({
    where: {
      id: sessionId,
      professeurId: session.user.id,
    }
  });

  if (!sessionRecord) {
     console.error(`👑 [API WB-CONTROLLER] Session ${sessionId} non trouvée ou n'appartient pas à l'utilisateur ${session.user.id}`);
     return new NextResponse('Session not found or not owned by user', { status: 404 });
  }

  console.log(`👑 [API WB-CONTROLLER] - Requête reçue pour la session ${sessionId}`);
  try {
    const body = await request.json();
    const { controllerId } = body;
    console.log(`  -> Nouveau contrôleur demandé: ${controllerId}`);

    if (controllerId === undefined) {
      console.error('❌ [API WB-CONTROLLER] - controllerId est requis.');
      return new NextResponse('controllerId is required', { status: 400 });
    }

    const channel = getSessionChannelName(sessionId);
    const payload = { controllerId: controllerId === null ? session.user.id : controllerId };

    console.log(`  -> Déclenchement de '${AblyEvents.WHITEBOARD_CONTROLLER_UPDATE}' sur le canal ${channel} avec le payload:`, payload);
    await ablyTrigger(channel, AblyEvents.WHITEBOARD_CONTROLLER_UPDATE, payload);

    console.log('✅ [API WB-CONTROLLER] - Événement diffusé avec succès.');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`💥 [API WB-CONTROLLER] - Erreur interne pour la session ${sessionId}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
