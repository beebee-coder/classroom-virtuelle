
// src/app/api/whiteboard/state/[sessionId]/route.ts
// CE FICHIER EST MAINTENANT OBSOLÈTE.

import { NextRequest, NextResponse } from 'next/server';

/**
 * @deprecated La logique de récupération de l'état a été centralisée
 * et cette méthode n'est plus utilisée.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  console.warn(`[API-WB-STATE] Appel d'une route dépréciée: /api/whiteboard/state/${params.sessionId}`);
  
  return NextResponse.json(
    { 
      error: 'This endpoint is deprecated. Whiteboard state is now fully managed via real-time events.' 
    },
    { status: 410 } // 410 Gone
  );
}

    