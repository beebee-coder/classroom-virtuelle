// src/app/api/session/pending-invitations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Cette API recherche si une session est active pour la classe de l'élève
// mais à laquelle il n'a pas encore participé.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    console.log('📨 [API PENDING INVITATIONS] - Recherche pour étudiant:', studentId);

    if (!studentId) {
      return NextResponse.json(
        { error: 'ID étudiant requis' },
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

    // Trouver une session active pour sa classe où il a été invité mais n'est pas encore un participant actif de la session live
    // (Cette logique est simplifiée: on cherche juste une session active pour sa classe)
    const activeSession = await prisma.coursSession.findFirst({
        where: {
            classroomId: student.classeId,
            endTime: null, // La session est encore active
            participants: {
                some: {
                    id: student.id // L'élève a été invité
                }
            }
        },
        include: {
            professeur: { select: { id: true, name: true } },
            classe: { select: { id: true, nom: true } }
        },
        orderBy: {
            startTime: 'desc'
        }
    });

    if (!activeSession) {
        console.log('✅ [API PENDING INVITATIONS] - Aucune invitation en attente trouvée.');
        return NextResponse.json([]);
    }
    
    // Formatter la réponse pour qu'elle corresponde à ce que le client attend
    const pendingInvitation = [{
        data: {
            sessionId: activeSession.id,
            teacherId: activeSession.professeurId,
            classroomId: activeSession.classroomId,
            classroomName: activeSession.classe?.nom || 'Classe',
            teacherName: activeSession.professeur.name || 'Professeur',
            timestamp: activeSession.startTime.toISOString(),
            type: 'session-invitation'
        }
    }];

    console.log('✅ [API PENDING INVITATIONS] - Invitation en attente trouvée:', pendingInvitation);

    return NextResponse.json(pendingInvitation);

  } catch (error) {
    console.error('❌ [API PENDING INVITATIONS] - Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
