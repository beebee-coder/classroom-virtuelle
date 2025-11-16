// app/api/ably/token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import Ably from 'ably';

// Timeout config
const AUTH_TIMEOUT_MS = 8000;

export async function GET(request: NextRequest) {
    console.log('🚪 [ABLY TOKEN] - Token request received');

    const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Authentication timeout')), AUTH_TIMEOUT_MS)
    );

    try {
        const session = await Promise.race([
            getServerSession(authOptions),
            timeoutPromise
        ]);

        console.log('🔍 [ABLY TOKEN] - Session verified:', {
            hasSession: !!session,
            hasUser: !!session?.user,
            userId: session?.user?.id?.substring(0, 8)
        });

        if (!session?.user?.id) {
            console.error('❌ [ABLY TOKEN] - Invalid user session');
            return new NextResponse('Unauthorized', { 
                status: 401,
                headers: { 'Cache-Control': 'no-store' }
            });
        }

        const ablyApiKey = process.env.ABLY_API_KEY;
        if (!ablyApiKey) {
            console.error('❌ [ABLY TOKEN] - ABLY_API_KEY not configured');
            return new NextResponse('Server configuration error', { status: 500 });
        }

        const clientId = session.user.id;
        console.log(`🔑 [ABLY TOKEN] - Creating token for: ${clientId.substring(0, 8)}...`);

        const ably = new Ably.Rest(ablyApiKey);
        
        const tokenRequest = await Promise.race([
            new Promise<Ably.Types.TokenRequest>((resolve, reject) => {
                ably.auth.createTokenRequest(
                    {
                        clientId: clientId,
                        capability: {
                            'classroom-connector:*': ['presence', 'subscribe', 'publish']
                        },
                        ttl: 3600000 // 1 hour
                    },
                    (err, tokenRequest) => {
                        if (err) {
                            console.error('❌ [ABLY TOKEN] - Token creation error:', err);
                            reject(err);
                        } else {
                            console.log(`✅ [ABLY TOKEN] - Token created for ${clientId.substring(0, 8)}...`);
                            resolve(tokenRequest!);
                        }
                    }
                );
            }),
            timeoutPromise
        ]);

        return NextResponse.json(tokenRequest, {
            headers: { 'Cache-Control': 'no-store' }
        });

    } catch (error) {
        console.error('💥 [ABLY TOKEN] - Error:', error);

        if (error instanceof Error && error.message === 'Authentication timeout') {
            return new NextResponse('Authentication timeout', { 
                status: 408,
                headers: { 'Cache-Control': 'no-store' }
            });
        }

        return new NextResponse('Internal server error', { 
            status: 500,
            headers: { 'Cache-Control': 'no-store' }
        });
    }
}