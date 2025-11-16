// src/app/api/ably/auth/route.ts - VERSION CORRIGÉE POUR 11 UTILISATEURS
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import Ably from 'ably';

// CORRECTION : Timeout augmenté pour supporter 11 utilisateurs simultanés
const AUTH_TIMEOUT_MS = 20000; // 20 secondes au lieu de 8 secondes

export async function POST(request: NextRequest) {
    console.log('🚪 [ABLY AUTH] - Requête d\'authentification reçue');

    // CORRECTION : Gestion du timeout avec AbortController pour meilleur contrôle
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);

    try {
        // CORRECTION : Utilisation de AbortController pour les timeouts
        const session = await getServerSession(authOptions);
        
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

        // CORRECTION : Parser le corps de la requête avec timeout séparé
        let requestBody;
        try {
            const bodyPromise = request.json();
            requestBody = await Promise.race([
                bodyPromise,
                new Promise<never>((_, reject) => 
                    setTimeout(() => reject(new Error('Request body parsing timeout')), 5000)
                )
            ]);
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

        // CORRECTION : Création du token avec timeout optimisé
        const ably = new Ably.Rest({
            key: ablyApiKey,
            // CORRECTION : Timeout HTTP augmenté pour Ably Rest
            httpRequestTimeout: 15000,
            httpMaxRetryCount: 2
        });
        
        const tokenRequest = await new Promise<Ably.Types.TokenRequest>((resolve, reject) => {
            // Timeout pour la création du token
            const tokenTimeout = setTimeout(() => {
                reject(new Error('Token creation timeout'));
            }, 15000);

            ably.auth.createTokenRequest(
                {
                    clientId: clientId,
                    capability: {
                        'classroom-connector:*': ['presence', 'subscribe', 'publish']
                    },
                    ttl: 3600000 // 1 heure
                },
                (err, tokenRequest) => {
                    clearTimeout(tokenTimeout);
                    if (err) {
                        console.error('❌ [ABLY AUTH] - Erreur création token:', err);
                        reject(err);
                    } else {
                        console.log(`✅ [ABLY AUTH] - Jeton créé pour ${clientId.substring(0, 8)}...`);
                        resolve(tokenRequest!);
                    }
                }
            );
        });

        // CORRECTION : Nettoyage du timeout global
        clearTimeout(timeoutId);

        // Réponse avec headers anti-cache
        return NextResponse.json(tokenRequest, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Content-Type': 'application/json',
                // CORRECTION : Headers pour éviter la mise en cache
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });

    } catch (error) {
        // CORRECTION : Nettoyage du timeout en cas d'erreur
        clearTimeout(timeoutId);
        
        console.error('💥 [ABLY AUTH] - Erreur:', error);

        if (error instanceof Error) {
            if (error.name === 'AbortError' || error.message.includes('timeout')) {
                console.error('⏰ [ABLY AUTH] - Timeout d\'authentification');
                return new NextResponse('Authentication timeout - please try again', { 
                    status: 408, // 408 Request Timeout
                    headers: {
                        'Cache-Control': 'no-store, no-cache, must-revalidate',
                        'Retry-After': '5'
                    }
                });
            }
            
            if (error.message.includes('ABLY')) {
                console.error('🔌 [ABLY AUTH] - Erreur Ably spécifique:', error.message);
                return new NextResponse('Ably service temporarily unavailable', { 
                    status: 503,
                    headers: {
                        'Cache-Control': 'no-store, no-cache, must-revalidate',
                        'Retry-After': '10'
                    }
                });
            }
        }

        return new NextResponse(
            'Internal server error - please try again later', 
            { 
                status: 500,
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate'
                }
            }
        );
    }
}