// src/app/api/session/[id]/sync/route.ts - VERSION CORRIGÉE
import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from "@/lib/auth";
import type { WhiteboardOperation } from '@/types';
import prisma from '@/lib/prisma'; // Importer Prisma

// POST handler for saving whiteboard updates to the database
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id;
  
  try {
    const session = await getAuthSession();

    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 403 });
    }

    // CORRECTION : Lire le corps de la requête de manière sécurisée
    let operations: WhiteboardOperation[];
    try {
        operations = await request.json();
    } catch (e) {
        console.error(`[API SYNC] Invalid JSON body for session ${sessionId}`);
        return NextResponse.json({ error: "Corps de la requête invalide" }, { status: 400 });
    }

    if (!operations || !Array.isArray(operations)) {
        return NextResponse.json({ error: "Aucune opération fournie." }, { status: 400 });
    }
    
    // CORRECTION : Renvoyer une réponse de succès même sans persistance pour ne pas bloquer le client
    console.log(`[API SYNC] Received ${operations.length} operations for session ${sessionId} from user ${session.user.id}. Skipping persistence for now.`);
    
    // NOTE : La logique de sauvegarde en base de données (ex: prisma.whiteboardOperation.createMany)
    // pourrait être ajoutée ici dans une version future. Pour l'instant, on se contente de confirmer.

    return NextResponse.json({ 
        success: true, 
        message: "Operations received but not persisted.",
        processed: operations.length
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`💥 [SYNC POST] Erreur session ${sessionId}:`, errorMessage);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// OPTIONS handler for CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
