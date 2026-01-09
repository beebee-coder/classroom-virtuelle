// src/app/api/ably/token/route.ts - VERSION CORRIGÉE POUR ABLY v2+
import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from "@/lib/auth";
import Ably, {
  type TokenRequest,
  type ErrorInfo,
} from 'ably';

// Timeout config
const AUTH_TIMEOUT_MS = 8000;

// ✅ CORRECTION : Force le mode dynamique pour éviter le rendu statique
export const dynamic = 'force-dynamic';

// Helper pour gérer le timeout avec typage propre
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Authentication timeout')), ms)
    ),
  ]);
};

export async function GET(request: NextRequest) {
    console.log('🚪 [ABLY TOKEN] - Token request received');

    try {
        const session = await withTimeout(getAuthSession(), AUTH_TIMEOUT_MS);

        console.log('🔍 [ABLY TOKEN] - Session verified:', {
            hasSession: !!session,
            hasUser: !!session?.user,
            userId: session?.user?.id?.substring(0, 8)
        });

        if (!session?.user?.id) {
            console.error('❌ [ABLY TOKEN] - Invalid user session');
            return new NextResponse('Unauthorized', { 
                status: 401,
                headers: { 
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                    'Pragma': 'no-cache'
                }
            });
        }

        const ablyApiKey = process.env.ABLY_API_KEY;
        if (!ablyApiKey) {
            console.error('❌ [ABLY TOKEN] - ABLY_API_KEY not configured');
            return new NextResponse('Server configuration error', { 
                status: 500,
                headers: { 
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                    'Pragma': 'no-cache'
                }
            });
        }

        const clientId = session.user.id;
        console.log(`🔑 [ABLY TOKEN] - Creating token for: ${clientId.substring(0, 8)}...`);

        const ably = new Ably.Rest(ablyApiKey);

        // ✅ CORRECTION MAJEURE : utiliser la version promise-based de createTokenRequest
        let tokenRequest: TokenRequest;
        try {
            tokenRequest = await withTimeout(
                ably.auth.createTokenRequest({
                    clientId: clientId,
                    capability: {
                        'classroom-connector:*': ['presence', 'subscribe', 'publish']
                    },
                    ttl: 3600000 // 1 hour
                }),
                AUTH_TIMEOUT_MS
            );
        } catch (err) {
            // En contexte serveur, Ably rejette avec un objet Error standard
            const error = err as Error;
            console.error('❌ [ABLY TOKEN] - Token creation error:', {
                message: error.message,
                stack: error.stack?.split('\n').slice(0, 3)
            });
            throw error;
        }

        console.log(`✅ [ABLY TOKEN] - Token created for ${clientId.substring(0, 8)}...`);

        return NextResponse.json(tokenRequest, {
            headers: { 
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Surrogate-Control': 'no-store'
            }
        });

    } catch (error) {
        console.error('💥 [ABLY TOKEN] - Error:', error);

        if (error instanceof Error && error.message === 'Authentication timeout') {
            return new NextResponse('Authentication timeout', { 
                status: 408,
                headers: { 
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                    'Pragma': 'no-cache'
                }
            });
        }

        return new NextResponse('Internal server error', { 
            status: 500,
            headers: { 
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Pragma': 'no-cache'
            }
        });
    }
}
