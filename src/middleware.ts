
// src/middleware.ts - VERSION CORRIGÉE
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // La logique du middleware peut être étendue ici si nécessaire,
    // mais pour l'instant, nous laissons passer toutes les requêtes
    // non interceptées par le `matcher` ci-dessous.
    return NextResponse.next();
}

export const config = {
    // 🔥 CORRECTION : Le matcher est mis à jour pour ignorer TOUTES les routes API,
    // ainsi que les fichiers statiques, les images, et le favicon.
    // Cela empêche le middleware d'interférer avec les routes de NextAuth.js, Ably, etc.
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
