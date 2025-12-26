// src/app/api/ably/auth/route.ts - CORRIGÉ POUR APP ROUTER + JWT
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import Ably, {
  type TokenParams,
  type TokenRequest,
  type ErrorInfo,
} from 'ably';

// Timeout global pour la fonction serverless
export const maxDuration = 10;

export async function POST(request: NextRequest) {
  console.log('🚪 [ABLY AUTH] - Requête d\'authentification reçue');

  try {
    // ✅ CORRECTION : Utilisation de getToken() pour la stratégie JWT en App Router
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    // Vérifie que le token existe et contient un ID utilisateur
    if (!token?.id || typeof token.id !== 'string') {
      console.error('❌ [ABLY AUTH] - Token JWT invalide, manquant ou sans ID utilisateur.');
      return NextResponse.json({ error: 'Unauthorized: Valid session required' }, { status: 401 });
    }

    // Optionnel : vous pouvez aussi vérifier le rôle si nécessaire
    // if (token.role !== 'PROFESSEUR' && token.role !== 'ELEVE') { ... }

    const clientId = token.id;
    console.log(`✅ [ABLY AUTH] - Token JWT valide trouvé pour l'utilisateur: ${clientId}`);

    const ablyApiKey = process.env.ABLY_API_KEY;
    if (!ablyApiKey) {
      console.error('❌ [ABLY AUTH] - Variable d\'environnement ABLY_API_KEY manquante.');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const ably = new Ably.Rest({ key: ablyApiKey });

    const tokenParams: TokenParams = {
      clientId: clientId,
      capability: {
        [`${process.env.ABLY_CHANNEL_PREFIX || 'classroom-connector'}:*`]: ["presence", "subscribe", "publish"],
      },
      ttl: 3600000, // 1 heure
    };

    let tokenRequest: TokenRequest;
    try {
      tokenRequest = await ably.auth.createTokenRequest(tokenParams);
    } catch (err) {
      const error = err as ErrorInfo;
      console.error('❌ [ABLY AUTH] - Échec de la génération du token Ably:', {
        code: error.code,
        statusCode: error.statusCode,
        message: error.message
      });
      return NextResponse.json(
        { error: 'Token request failed', details: error.message },
        { status: 500 }
      );
    }

    if (!tokenRequest) {
      console.error('❌ [ABLY AUTH] - Aucun token retourné par Ably (cas théorique)');
      return NextResponse.json(
        { error: 'Token generation returned empty response' },
        { status: 500 }
      );
    }

    console.log(`✅ [ABLY AUTH] - Jeton créé avec succès pour ${clientId}.`);

    return NextResponse.json(tokenRequest, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('💥 [ABLY AUTH] - Erreur critique inattendue:', errorMessage);
    return NextResponse.json(
      { error: 'Internal Server Error', details: errorMessage },
      { status: 500 }
    );
  }
}

// Handler OPTIONS pour les requêtes CORS pre-flight.
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    }
  });
}