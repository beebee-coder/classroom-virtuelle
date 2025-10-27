// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Headers pour optimiser les performances
  const response = NextResponse.next();
  
  response.headers.set('X-Edge-Runtime', 'true');
  response.headers.set('Cache-Control', 'public, max-age=300');
  
  return response;
}

export const config = {
  matcher: [
    '/session/:path*',
    '/api/session/:path*',
    '/api/whiteboard/:path*'
  ],
};
