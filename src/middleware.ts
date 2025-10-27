// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Gérer explicitement les requêtes favicon pour éviter le bruit dans les logs et les traitements inutiles.
  // Cela retourne une réponse vide avec succès, ce qui est la pratique standard.
  if (request.nextUrl.pathname === '/favicon.ico') {
    return new NextResponse(null, { status: 204 });
  }
  
  // Pour toutes les autres routes correspondantes, nous ajoutons des headers et continuons.
  const response = NextResponse.next();
  response.headers.set('X-Edge-Runtime', 'true');
  response.headers.set('Cache-Control', 'public, max-age=300');
  
  return response;
}

export const config = {
  // Le matcher inclut maintenant le favicon ainsi que les autres routes.
  matcher: [
    '/session/:path*',
    '/api/session/:path*',
    '/api/whiteboard/:path*',
    '/favicon.ico',
  ],
};
