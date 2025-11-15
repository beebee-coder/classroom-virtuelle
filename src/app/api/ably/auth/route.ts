// src/app/api/ably/auth/route.ts - VERSION OPTIMISÉE
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import Ably from 'ably';

// Timeout config
const AUTH_TIMEOUT_MS = 8000; // 8 secondes pour laisser une marge

export async function POST(request: NextRequest) {
    console.log('🚪 [ABLY AUTH] - Requête d\'authentification reçue');

    // Gestion du timeout
    const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Authentication timeout')), AUTH_TIMEOUT_MS)
    );

    try {
        // Race condition entre l'authentification et le timeout
        const session = await Promise.race([
            getServerSession(authOptions),
            timeoutPromise
        ]);

        console.log('🔍 [ABLY AUTH] - Session vérifiée:', {
            hasSession: !!session,
            hasUser: !!session?.user,
            userId: session?.user?.id?.substring(0, 8) // Log partiel pour la sécurité
        });

        if (!session?.user?.id) {
            console.error('❌ [ABLY AUTH] - Session utilisateur non valide');
            return new NextResponse('Unauthorized: Valid session required', { 
                status: 401,
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate'
                }
            });
        }

        const { user } = session;

        // Parser le corps de la requête de manière optimisée
        let requestBody;
        try {
            requestBody = await request.json();
        } catch {
            requestBody = {};
        }
        
        const requestedClientId = requestBody.clientId;
        
        // Validation du clientId
        const clientId = requestedClientId && typeof requestedClientId === 'string' 
            ? requestedClientId 
            : user.id;

        console.log(`🔑 [ABLY AUTH] - Création du jeton pour: ${clientId.substring(0, 8)}...`);

        // Vérification de la clé API
        const ablyApiKey = process.env.ABLY_API_KEY;
        if (!ablyApiKey) {
            console.error('❌ [ABLY AUTH] - ABLY_API_KEY non configurée');
            return new NextResponse('Server configuration error', { status: 500 });
        }

        // Création du token avec timeout
        const ably = new Ably.Rest(ablyApiKey);
        
        const tokenRequest = await Promise.race([
            new Promise<Ably.Types.TokenRequest>((resolve, reject) => {
                ably.auth.createTokenRequest(
                    {
                        clientId: clientId,
                        capability: {
                            'classroom-connector:*': ['presence', 'subscribe', 'publish']
                        },
                        ttl: 3600000 // 1 heure
                    },
                    (err, tokenRequest) => {
                        if (err) {
                            console.error('❌ [ABLY AUTH] - Erreur création token:', err);
                            reject(err);
                        } else {
                            console.log(`✅ [ABLY AUTH] - Jeton créé pour ${clientId.substring(0, 8)}...`);
                            resolve(tokenRequest!);
                        }
                    }
                );
            }),
            timeoutPromise
        ]);

        // Réponse avec headers anti-cache
        return NextResponse.json(tokenRequest, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        console.error('💥 [ABLY AUTH] - Erreur:', error);

        if (error instanceof Error && error.message === 'Authentication timeout') {
            return new NextResponse('Authentication timeout', { 
                status: 408, // 408 Request Timeout
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate'
                }
            });
        }

        return new NextResponse(
            error instanceof Error ? error.message : 'Internal server error', 
            { 
                status: 500,
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate'
                }
            }
        );
    }
}