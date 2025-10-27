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

    // Timeout de secours
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 10000)
    );

    const sessionPromise = prisma.coursSession.findUnique({
      where: { id: sessionId },
      include: {
        professeur: {
          select: { id: true, name: true, email: true }
        },
        classe: {
          select: { id: true, nom: true }
        },
        participants: {
          select: { 
            id: true, 
            name: true, 
            email: true,
            role: true
          }
        },
        documentHistory: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      },
    });

    const session = await Promise.race([sessionPromise, timeoutPromise]);

    if (!session) {
      return NextResponse.json(
        { error: 'Session non trouvée' },
        { status: 404 }
      );
    }

    // Réponse optimisée
    return NextResponse.json({
      id: session.id,
      teacher: session.professeur,
      classroom: session.classe,
      students: session.participants.filter(p => p.role === 'ELEVE'),
      documentHistory: session.documentHistory,
      startTime: session.startTime,
      endTime: session.endTime,
    });

  } catch (error) {
    console.error('❌ Erreur chargement session:', error);
    
    if (error instanceof Error && error.message === 'Timeout') {
      return NextResponse.json(
        { error: 'Timeout du serveur' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
