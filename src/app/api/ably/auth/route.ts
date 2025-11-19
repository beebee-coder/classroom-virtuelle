// src/app/api/ably/auth/route.ts - VERSION CORRIGÉE POUR STABILITÉ
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import Ably from 'ably';

// ✅ CORRECTION : Timeout unique et optimisé
const AUTH_TIMEOUT_MS = 10000; // 10 secondes - suffisant pour Vercel

export async function POST(request: NextRequest) {
    console.log('🚪 [ABLY AUTH] - Requête d\'authentification reçue');

    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
        // ✅ CORRECTION : Timeout unique et bien géré
        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error('Authentication timeout'));
            }, AUTH_TIMEOUT_MS);
        });

        // ✅ CORRECTION : Session simple sans timeout imbriqué
        const sessionPromise = getServerSession(authOptions);
        
        const session = await Promise.race([sessionPromise, timeoutPromise]);
        
        console.log('🔍 [ABLY AUTH] - Session vérifiée:', {
            hasSession: !!session,
            hasUser: !!session?.user,
            userId: session?.user?.id?.substring(0, 8)
        });

        if (!session?.user?.id) {
            console.error('❌ [ABLY AUTH] - Session utilisateur non valide');
            return NextResponse.json(
                { error: 'Unauthorized: Valid session required' },
                { 
                    status: 401,
                    headers: {
                        'Cache-Control': 'no-store, no-cache, must-revalidate'
                    }
                }
            );
        }

        const { user } = session;

        // ✅ CORRECTION : Parsing du corps simplifié
        let clientId = user.id;
        try {
            const bodyText = await request.text();
            if (bodyText.trim()) {
                const requestBody = JSON.parse(bodyText);
                if (requestBody.clientId && typeof requestBody.clientId === 'string') {
                    clientId = requestBody.clientId;
                }
            }
        } catch (parseError) {
            console.warn('⚠️ [ABLY AUTH] - Corps de requête invalide, utilisation de l\'ID utilisateur par défaut');
        }
        
        console.log(`🔑 [ABLY AUTH] - Création du jeton pour: ${clientId.substring(0, 8)}...`);

        // ✅ CORRECTION : Vérification de la clé API simplifiée
        const ablyApiKey = process.env.ABLY_API_KEY;
        if (!ablyApiKey) {
            console.error('❌ [ABLY AUTH] - ABLY_API_KEY non configurée');
            return NextResponse.json(
                { error: 'Server configuration error' },
                { 
                    status: 500,
                    headers: {
                        'Cache-Control': 'no-store, no-cache, must-revalidate'
                    }
                }
            );
        }

        // ✅ CORRECTION : Configuration Ably optimisée
        const ably = new Ably.Rest({
            key: ablyApiKey,
            httpRequestTimeout: 15000,
            httpOpenTimeout: 10000,
            httpMaxRetryCount: 2,
            fallbackHosts: ['a.ably-realtime.com', 'b.ably-realtime.com', 'c.ably-realtime.com'],
            logLevel: (process.env.NODE_ENV === 'development' ? 2 : 1) as any,
            tls: true
        });
        
        // ✅ CORRECTION : Création du token avec timeout intégré
        const tokenRequest = await new Promise<Ably.Types.TokenRequest>((resolve, reject) => {
            let tokenTimeoutId: NodeJS.Timeout | null = null;
            
            try {
                tokenTimeoutId = setTimeout(() => {
                    reject(new Error('Token creation timeout'));
                }, 8000);

                ably.auth.createTokenRequest(
                    {
                        clientId: clientId,
                        capability: {
                            // ✅ CORRECTION : Capacités simplifiées et sécurisées
                            [`classroom-connector:session:*`]: ['presence', 'subscribe', 'publish'],
                            [`classroom-connector:class:*`]: ['presence', 'subscribe', 'publish'],
                            [`classroom-connector:user:${clientId}`]: ['subscribe'],
                            [`classroom-connector:system`]: ['subscribe']
                        },
                        ttl: 3600000, // 1 heure
                        nonce: Math.random().toString(36).substring(2, 15)
                    },
                    (err, tokenRequest) => {
                        if (tokenTimeoutId) clearTimeout(tokenTimeoutId);
                        
                        if (err) {
                            console.error('❌ [ABLY AUTH] - Erreur création token:', {
                                code: err.code,
                                statusCode: err.statusCode,
                                message: err.message
                            });
                            
                            // ✅ CORRECTION : Gestion d'erreur simplifiée
                            if (err.code === 40100) {
                                reject(new Error('Invalid API key'));
                            } else {
                                reject(new Error(`Ably error: ${err.message}`));
                            }
                        } else if (tokenRequest) {
                            console.log(`✅ [ABLY AUTH] - Jeton créé pour ${clientId.substring(0, 8)}...`);
                            resolve(tokenRequest);
                        } else {
                            reject(new Error('Token request returned null'));
                        }
                    }
                );
            } catch (syncError) {
                if (tokenTimeoutId) clearTimeout(tokenTimeoutId);
                reject(syncError);
            }
        });

        // ✅ CORRECTION : Nettoyage du timeout principal
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }

        // ✅ CORRECTION : Réponse simplifiée avec headers optimisés
        return NextResponse.json(tokenRequest, {
            status: 200,
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
                'Content-Type': 'application/json; charset=utf-8',
                'Pragma': 'no-cache',
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY'
            }
        });

    } catch (error) {
        // ✅ CORRECTION : Nettoyage garantie du timeout
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        
        console.error('💥 [ABLY AUTH] - Erreur critique:', error);

        let statusCode = 500;
        let errorMessage = 'Internal server error';
        let retryAfter = '5';

        if (error instanceof Error) {
            if (error.message.includes('timeout') || error.message.includes('Timeout')) {
                statusCode = 408;
                errorMessage = 'Authentication timeout - please try again';
                retryAfter = '3';
            } else if (error.message.includes('Unauthorized') || error.message.includes('session')) {
                statusCode = 401;
                errorMessage = 'Authentication required';
            } else if (error.message.includes('API key') || error.message.includes('Ably')) {
                statusCode = 503;
                errorMessage = 'Service temporarily unavailable';
                retryAfter = '10';
            }
        }

        // ✅ CORRECTION : Réponse d'erreur structurée
        return NextResponse.json(
            { error: errorMessage },
            { 
                status: statusCode,
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                    'Retry-After': retryAfter
                }
            }
        );
    }
}

// ✅ CORRECTION : OPTIONS handler simplifié
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
        }
    });
}