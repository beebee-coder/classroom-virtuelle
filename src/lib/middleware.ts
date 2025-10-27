// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Gérer explicitement les requêtes favicon pour éviter le bruit dans les logs
  if (request.nextUrl.pathname === '/favicon.ico') {
    return new NextResponse(null, { status: 204 });
  }
  
  // Headers pour optimiser les performances sur les autres routes correspondantes
  const response = NextResponse.next();
  
  response.headers.set('X-Edge-Runtime', 'true');
  response.headers.set('Cache-Control', 'public, max-age=300');
  
  return response;
}

export const config = {
  matcher: [
    '/session/:path*',
    '/api/session/:path*',
    '/api/whiteboard/:path*',
    '/favicon.ico', // Ajouter favicon au matcher
  ],
};
