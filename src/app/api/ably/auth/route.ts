// src/app/api/ably/auth/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import Ably from 'ably';

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

        const tokenParams: Ably.Types.TokenParams = {
            clientId: clientId,
            capability: {
                [`${process.env.ABLY_CHANNEL_PREFIX || 'classroom-connector'}:*`]: ["presence", "subscribe", "publish"],
            },
            ttl: 3600000, // 1 heure
        };
        
        const tokenRequest = await new Promise<Ably.Types.TokenRequest>((resolve, reject) => {
            ably.auth.createTokenRequest(tokenParams, (err: Ably.Types.ErrorInfo | null, token: Ably.Types.TokenRequest | null) => {
                if (err) {
                    return reject(err);
                }
                if (!token) {
                    return reject(new Error("Génération du token Ably a échoué sans erreur explicite."));
                }
                resolve(token);
            });
        });
        
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
