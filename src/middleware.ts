// src/middleware.ts - VERSION DÉSACTIVÉE POUR ABLY
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // NE PAS intercepter les requêtes Ably - laisser NextAuth gérer l'authentification
    if (request.nextUrl.pathname.startsWith('/api/ably')) {
        console.log('🔄 [MIDDLEWARE] - Bypassing middleware for Ably auth');
        return NextResponse.next();
    }
    
    return NextResponse.next();
}

export const config = {
    // Ne pas matcher les routes API Ably
    matcher: [
        '/((?!api/ably|_next/static|_next/image|favicon.ico).*)',
    ],
};