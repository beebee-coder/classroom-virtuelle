// src/app/api/session/[id]/whiteboard-controller/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { pusherTrigger } from '@/lib/pusher/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id;
  const session = await getServerSession(authOptions);

  // Seul le professeur peut changer le contrôleur
  if (session?.user?.role !== 'PROFESSEUR') {
    return new NextResponse('Unauthorized', { status: 403 });
  }

  console.log(`👑 [API WB-CONTROLLER] - Requête pour la session ${sessionId}`);
  try {
    const body = await request.json();
    const { controllerId } = body;
    console.log(`  Nouveau contrôleur demandé: ${controllerId}`);

    if (!controllerId) {
      console.error('❌ [API WB-CONTROLLER] - controllerId est requis.');
      return new NextResponse('controllerId is required', { status: 400 });
    }

    const channel = `presence-session-${sessionId}`;
    console.log(`  Déclenchement de 'whiteboard-controller-update' sur le canal ${channel}`);
    await pusherTrigger(channel, 'whiteboard-controller-update', { controllerId });

    console.log('✅ [API WB-CONTROLLER] - Événement diffusé avec succès.');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`💥 [API WB-CONTROLLER] - Erreur interne pour la session ${sessionId}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
