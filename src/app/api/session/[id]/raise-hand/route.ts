// src/app/api/session/[id]/raise-hand/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { updateStudentSessionStatus } from '@/lib/actions/session.actions';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id;
  try {
    const body = await request.json();
    const { userId, isRaised } = body;

    if (userId === undefined || isRaised === undefined) {
      return new NextResponse('userId and isRaised are required', { status: 400 });
    }

    // Utiliser l'action serveur existante pour déclencher l'événement Pusher
    // Note: l'action `updateStudentSessionStatus` prend l'ID de l'utilisateur depuis la session,
    // mais pour la levée de main, nous spécifions l'ID de l'élève.
    // Nous allons appeler directement le trigger Pusher ici pour plus de clarté
    // ou modifier l'action pour accepter un userId.
    // Pour l'instant, on utilise l'action telle quelle, en supposant qu'elle est adaptée.
    // La logique existante dans updateStudentSessionStatus va déjà faire le broadcast.
    
    // Pour que le professeur puisse baisser la main d'un autre, il faudrait modifier
    // l'action pour accepter un `userId` en paramètre.
    // Pour la simplicité, nous allons juste appeler l'action, en assumant qu'elle
    // a été conçue pour cela (même si elle utilise la session).
    // Une meilleure approche serait de créer une action dédiée.
    
    // Correction: L'action `updateStudentSessionStatus` utilise la session de l'appelant.
    // Nous devons donc créer une nouvelle action ou appeler Pusher directement.
    // Pour ne pas modifier trop de fichiers, nous allons créer une petite action
    // ici qui utilise le trigger directement.

    const { pusherTrigger } = await import('@/lib/pusher/server');
    const channel = `presence-session-${sessionId}`;
    await pusherTrigger(channel, 'hand-raise-update', { userId, isRaised });


    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[API RAISE-HAND] - Erreur pour la session ${sessionId}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
