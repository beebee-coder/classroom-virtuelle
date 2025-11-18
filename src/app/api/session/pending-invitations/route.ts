
// src/app/api/session/pending-invitations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    console.log('📨 [API PENDING INVITATIONS] - Recherche pour étudiant:', studentId);

    if (!studentId) {
      return NextResponse.json(
        { error: 'ID étuditant requis' },
        { status: 400 }
      );
    }

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, classeId: true }
    });

    if (!student || !student.classeId) {
      return NextResponse.json(
        { error: 'Étudiant non trouvé ou non assigné à une classe' },
        { status: 404 }
      );
    }

    // 🔥 CORRECTION CRITIQUE : 
    // 1. Ne chercher que les sessions démarrées récemment (moins de 10 minutes)
    // 2. Vérifier que l'élève n'a pas déjà rejoint
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const recentActiveSession = await prisma.coursSession.findFirst({
      where: {
        classroomId: student.classeId,
        endTime: null, // Session toujours active
        startTime: {
          gte: tenMinutesAgo // Session démarrée il y a moins de 10 minutes
        },
        // L'élève est dans la liste des participants (a été invité)
        participants: {
          some: {
            id: student.id
          }
        }
      },
      include: {
        professeur: { select: { id: true, name: true } },
        classe: { select: { id: true, nom: true } },
      },
      orderBy: {
        startTime: 'desc'
      }
    });

    // 🔥 FILTRE SUPPLÉMENTAIRE : Vérifier si l'élève a déjà interagi avec la session
    if (recentActiveSession) {
      
      // Formatter la réponse
      const pendingInvitation = [{
        id: recentActiveSession.id, // Garder l'ID de session pour le traitement
        data: {
          sessionId: recentActiveSession.id,
          teacherId: recentActiveSession.professeurId,
          classroomId: recentActiveSession.classroomId,
          classroomName: recentActiveSession.classe?.nom || 'Classe',
          teacherName: recentActiveSession.professeur?.name || 'Professeur',
          timestamp: recentActiveSession.startTime.toISOString(),
          type: 'session-invitation'
        }
      }];

      console.log('✅ [API PENDING INVITATIONS] - Invitation RÉCENTE trouvée:', pendingInvitation);
      return NextResponse.json(pendingInvitation);
    }

    console.log('✅ [API PENDING INVITATIONS] - Aucune invitation RÉCENTE trouvée.');
    return NextResponse.json([]);

  } catch (error) {
    console.error('❌ [API PENDING INVITATIONS] - Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

    