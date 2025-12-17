// src/app/api/ably/auth/route.ts - VERSION CORRIGÉE POUR ABLY v2+
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
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
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            console.error('❌ [ABLY AUTH] - Session utilisateur non valide ou expirée.');
            return NextResponse.json({ error: 'Unauthorized: Valid session required' }, { status: 401 });
        }
        
        console.log(`✅ [ABLY AUTH] - Session valide trouvée pour l'utilisateur: ${session.user.id}`);

        const ablyApiKey = process.env.ABLY_API_KEY;
        if (!ablyApiKey) {
            console.error('❌ [ABLY AUTH] - Variable d\'environnement ABLY_API_KEY manquante.');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const clientId = session.user.id;
        console.log(`🔑 [ABLY AUTH] - Création du jeton pour le clientId: ${clientId}`);

        const ably = new Ably.Rest({ key: ablyApiKey });

        const tokenParams: TokenParams = {
            clientId: clientId,
            capability: {
                // Permissions granulaires et sécurisées
                [`${process.env.ABLY_CHANNEL_PREFIX || 'classroom-connector'}:*`]: ["presence", "subscribe", "publish"],
            },
            ttl: 3600000, // 1 heure
        };

        // ✅ CORRECTION MAJEURE : Utiliser la version promise-based de createTokenRequest (v2+)
        // Aucun callback nécessaire → plus simple, plus sûr, typé nativement
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

        return NextResponse.json(tokenRequest);

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
        status: 204, // No Content
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400', // 24 heures
        }
    });
}