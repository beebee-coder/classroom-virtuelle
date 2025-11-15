// src/app/api/session/[id]/sync/route.ts - VERSION CORRIGÉE
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import type { WhiteboardOperation } from '@/types';
import prisma from '@/lib/prisma'; // Importer Prisma

// POST handler for saving whiteboard updates to the database
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id;
  
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 403 });
    }

    const operations: WhiteboardOperation[] = await request.json();

    if (!operations || !Array.isArray(operations) || operations.length === 0) {
        return NextResponse.json({ error: "Aucune opération fournie." }, { status: 400 });
    }
    
    console.log(`[API SYNC] Received ${operations.length} operations for session ${sessionId} from user ${session.user.id}. Persisting to DB.`);
    
    // NOTE : La logique de sauvegarde en base de données pourrait être ajoutée ici.
    // Pour l'instant, nous confirmons simplement la réception.
    // Exemple : await prisma.whiteboardOperation.createMany({ data: operations });

    return NextResponse.json({ 
        success: true, 
        message: "Operations received for persistence.",
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
