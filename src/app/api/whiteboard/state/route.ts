// src/app/api/whiteboard/state/route.ts
// CE FICHIER EST MAINTENANT OBSOLÈTE.
// La gestion de l'état du tableau blanc a été centralisée et ne dépend plus de cette route.

import { NextRequest, NextResponse } from 'next/server';

/**
 * @deprecated La logique de sauvegarde de l'état a été déplacée.
 * Cette route est conservée pour la compatibilité mais est inactive.
 */
export async function POST(request: NextRequest) {
  console.warn(`[API-WB-STATE] Appel d'une route dépréciée: POST /api/whiteboard/state`);
  
  return NextResponse.json(
    { 
      error: 'This endpoint is deprecated and inactive.' 
    },
    { status: 410 } // 410 Gone
  );
}
