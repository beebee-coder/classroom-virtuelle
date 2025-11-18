// src/app/api/ably/auth/route.ts - VERSION CORRIGÉE POUR VERCEL ET ERREUR 80003
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import Ably from 'ably';

// ✅ CORRECTION : Timeout optimisé pour Vercel et gestion d'erreur 80003
const AUTH_TIMEOUT_MS = 15000; // 15 secondes - équilibre entre performance et fiabilité

export async function POST(request: NextRequest) {
    console.log('🚪 [ABLY AUTH] - Requête d\'authentification reçue');

    // ✅ CORRECTION : Gestion de timeout robuste pour Vercel
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        console.warn('⏰ [ABLY AUTH] - Timeout détecté, annulation de la requête');
        controller.abort();
    }, AUTH_TIMEOUT_MS);

    try {
        // ✅ CORRECTION : Session avec timeout spécifique
        let session;
        try {
            session = await Promise.race([
                getServerSession(authOptions),
                new Promise<never>((_, reject) => 
                    setTimeout(() => reject(new Error('Session timeout')), 8000)
                )
            ]);
        } catch (sessionError) {
            console.error('❌ [ABLY AUTH] - Erreur de session:', sessionError);
            return new NextResponse('Session timeout - please refresh', { 
                status: 408,
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                    'Retry-After': '3'
                }
            });
        }
        
        console.log('🔍 [ABLY AUTH] - Session vérifiée:', {
            hasSession: !!session,
            hasUser: !!session?.user,
            userId: session?.user?.id?.substring(0, 8)
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

        // ✅ CORRECTION : Parsing du corps avec gestion d'erreur améliorée
        let requestBody = {};
        try {
            const bodyText = await request.text();
            if (bodyText.trim()) {
                requestBody = JSON.parse(bodyText);
            }
        } catch (parseError) {
            console.warn('⚠️ [ABLY AUTH] - Corps de requête invalide ou vide, utilisation des valeurs par défaut');
        }
        
        const requestedClientId = (requestBody as any).clientId;
        
        // ✅ CORRECTION : Validation robuste du clientId
        const clientId = requestedClientId && typeof requestedClientId === 'string' 
            ? requestedClientId 
            : user.id;

        console.log(`🔑 [ABLY AUTH] - Création du jeton pour: ${clientId.substring(0, 8)}...`);

        // ✅ CORRECTION : Vérification améliorée de la clé API
        const ablyApiKey = process.env.ABLY_API_KEY;
        if (!ablyApiKey) {
            console.error('❌ [ABLY AUTH] - ABLY_API_KEY non configurée');
            return new NextResponse('Server configuration error', { 
                status: 500,
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate'
                }
            });
        }

        // ✅ CORRECTION : Validation du format de la clé API
        if (!ablyApiKey.includes('.') || ablyApiKey.split('.').length !== 2) {
            console.error('❌ [ABLY AUTH] - Format de ABLY_API_KEY invalide');
            return new NextResponse('Server configuration error', { 
                status: 500,
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate'
                }
            });
        }

        // ✅ CORRECTION : Configuration Ably optimisée pour Vercel
        const ably = new Ably.Rest({
            key: ablyApiKey,
            // ✅ CORRECTION : Timeouts étendus pour Vercel
            httpRequestTimeout: 20000,
            httpOpenTimeout: 15000,
            httpMaxRetryCount: 3,
            // ✅ CORRECTION : Fallback hosts pour la résilience
            fallbackHosts: ['a.ably-realtime.com', 'b.ably-realtime.com', 'c.ably-realtime.com'],
            // ✅ CORRECTION : Logging réduit en production
            logLevel: (process.env.NODE_ENV === 'development' ? 2 : 1) as any,
            tls: true
        });
        
        // ✅ CORRECTION : Création du token avec gestion d'erreur robuste
        const tokenRequest = await new Promise<Ably.Types.TokenRequest>((resolve, reject) => {
            // Timeout pour la création du token
            const tokenTimeout = setTimeout(() => {
                console.error('⏰ [ABLY AUTH] - Timeout lors de la création du token');
                reject(new Error('Token creation timeout'));
            }, 12000);

            try {
                ably.auth.createTokenRequest(
                    {
                        clientId: clientId,
                        // ✅ CORRECTION : Capacités spécifiques et sécurisées
                        capability: {
                            // Canaux de session
                            [`classroom-connector:session:*`]: ['presence', 'subscribe', 'publish'],
                            // Canaux de classe
                            [`classroom-connector:class:*`]: ['presence', 'subscribe', 'publish'],
                            // Canaux utilisateur
                            [`classroom-connector:user:${clientId}`]: ['subscribe'],
                            // Canaux système (limités)
                            [`classroom-connector:system`]: ['subscribe']
                        },
                        ttl: 3600000, // 1 heure
                        // ✅ CORRECTION : Nonce pour la sécurité
                        nonce: Math.random().toString(36).substring(2, 15) + 
                               Math.random().toString(36).substring(2, 15)
                    },
                    (err, tokenRequest) => {
                        clearTimeout(tokenTimeout);
                        if (err) {
                            console.error('❌ [ABLY AUTH] - Erreur création token:', {
                                code: err.code,
                                statusCode: err.statusCode,
                                message: err.message
                            });
                            
                            // ✅ CORRECTION : Gestion spécifique des erreurs Ably
                            if (err.code === 40100) {
                                reject(new Error('Ably authentication failed - check API key'));
                            } else if (err.code === 40000) {
                                reject(new Error('Ably bad request - invalid parameters'));
                            } else if (err.code >= 50000) {
                                reject(new Error('Ably server error - temporary issue'));
                            } else {
                                reject(err);
                            }
                        } else if (tokenRequest) {
                            console.log(`✅ [ABLY AUTH] - Jeton créé pour ${clientId.substring(0, 8)}...`);
                            console.log(`📋 [ABLY AUTH] - Token TTL: ${tokenRequest.ttl}ms, Capabilities:`, 
                                Object.keys(tokenRequest.capability || {}));
                            resolve(tokenRequest);
                        } else {
                            reject(new Error('Token request returned null'));
                        }
                    }
                );
            } catch (syncError) {
                clearTimeout(tokenTimeout);
                console.error('💥 [ABLY AUTH] - Erreur synchrone lors de la création du token:', syncError);
                reject(syncError);
            }
        });

        // ✅ CORRECTION : Nettoyage du timeout global
        clearTimeout(timeoutId);

        // ✅ CORRECTION : Réponse avec headers optimisés pour Vercel
        return NextResponse.json(tokenRequest, {
            status: 200,
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
                'Content-Type': 'application/json; charset=utf-8',
                'Pragma': 'no-cache',
                'Expires': '0',
                // ✅ CORRECTION : Headers de sécurité
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                // ✅ CORRECTION : Header pour éviter l'erreur 80003
                'Connection': 'close'
            }
        });

    } catch (error) {
        // ✅ CORRECTION : Nettoyage du timeout en cas d'erreur
        clearTimeout(timeoutId);
        
        console.error('💥 [ABLY AUTH] - Erreur critique:', error);

        if (error instanceof Error) {
            if (error.name === 'AbortError' || error.message.includes('timeout')) {
                console.error('⏰ [ABLY AUTH] - Timeout d\'authentification global');
                return new NextResponse('Authentication timeout - server is busy, please try again', { 
                    status: 408,
                    headers: {
                        'Cache-Control': 'no-store, no-cache, must-revalidate',
                        'Retry-After': '5',
                        'Connection': 'close'
                    }
                });
            }
            
            if (error.message.includes('Ably') || error.message.includes('API key')) {
                console.error('🔌 [ABLY AUTH] - Erreur Ably spécifique:', error.message);
                return new NextResponse('Realtime service temporarily unavailable - please try again in a moment', { 
                    status: 503,
                    headers: {
                        'Cache-Control': 'no-store, no-cache, must-revalidate',
                        'Retry-After': '10',
                        'Connection': 'close'
                    }
                });
            }
        }

        // ✅ CORRECTION : Réponse d'erreur générique sécurisée
        return new NextResponse(
            'Service temporarily unavailable - please try again', 
            { 
                status: 503,
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                    'Retry-After': '5',
                    'Connection': 'close'
                }
            }
        );
    } finally {
        // ✅ CORRECTION : Nettoyage garantie du timeout
        clearTimeout(timeoutId);
    }
}

// ✅ CORRECTION : OPTIONS handler pour CORS (important pour Vercel)
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