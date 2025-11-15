// src/app/api/whiteboard/sync/route.ts
// CE FICHIER EST OBSOLÈTE ET SERA SUPPRIMÉ.
// La logique a été centralisée dans /src/app/api/session/[id]/sync/route.ts pour plus de cohérence.
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'This endpoint is deprecated. Please use /api/session/:id/sync' }, { status: 410 });
}

export async function POST(request: NextRequest) {
   return NextResponse.json({ message: 'This endpoint is deprecated. Please use /api/session/:id/sync' }, { status: 410 });
}
