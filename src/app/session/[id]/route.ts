
// src/app/session/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;

    // Timeout de secours pour éviter que la requête ne reste bloquée indéfiniment
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Timeout de la requête dépassé')), 10000) // 10 secondes
    );

    const sessionPromise = prisma.coursSession.findUnique({
      where: { id: sessionId },
      include: {
        professeur: {
          select: { id: true, name: true, email: true, image: true, role: true }
        },
        classe: {
          select: { id: true, nom: true }
        },
        participants: {
          select: { 
            id: true, 
            name: true, 
            email: true,
            role: true,
            image: true,
            ambition: true,
            points: true,
          }
        },
        documentHistory: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      },
    });

    // Exécuter la requête avec le timeout
    const session = await Promise.race([sessionPromise, timeoutPromise]);

    if (!session) {
      console.warn(`[API SESSION] Session non trouvée pour l'ID: ${sessionId}`);
      return NextResponse.json(
        { error: 'Session non trouvée' },
        { status: 404 }
      );
    }

    // Préparer une réponse JSON optimisée et claire
    const responsePayload = {
      id: session.id,
      teacher: session.professeur,
      classroom: session.classe,
      students: session.participants.filter(p => p.role === 'ELEVE'),
      documentHistory: session.documentHistory,
      startTime: session.startTime,
      endTime: session.endTime,
    };
    
    return NextResponse.json(responsePayload);

  } catch (error) {
    console.error(`❌ Erreur lors du chargement de la session ${params.id}:`, error);
    
    if (error instanceof Error && error.message.includes('Timeout')) {
      return NextResponse.json(
        { error: 'La requête a pris trop de temps. Le serveur est peut-être surchargé.' },
        { status: 504 } // Gateway Timeout
      );
    }

    return NextResponse.json(
      { error: 'Erreur interne du serveur lors de la récupération de la session.' },
      { status: 500 }
    );
  }
}
