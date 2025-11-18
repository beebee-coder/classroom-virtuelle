
// src/app/api/whiteboard/operations/batch/route.ts
// CE FICHIER EST MAINTENANT OBSOLÈTE ET REDIRIGE LA LOGIQUE.

import { NextRequest, NextResponse } from 'next/server';
import { POST as syncPost } from '@/app/api/session/[id]/sync/route';

/**
 * @deprecated La logique de synchronisation a été centralisée.
 * Cette route est conservée pour la compatibilité et délègue l'appel.
 */
export async function POST(request: NextRequest) {
  const operations: any[] = await request.json();
  const sessionId = operations[0]?.sessionId;

  if (!sessionId) {
    return NextResponse.json({ error: 'SessionId manquant dans les opérations' }, { status: 400 });
  }
  
  console.warn(`[API-WB-BATCH] Appel d'une route dépréciée. Redirection de la logique vers /api/session/${sessionId}/sync`);

  // Remplacer "sessionId" par "id" pour correspondre à la structure attendue par syncPost
  const newParams = { params: { id: sessionId } };

  // Appeler directement la fonction POST de la nouvelle route centralisée
  return syncPost(request, newParams);
}

    