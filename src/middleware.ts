// src/middleware.ts
import { withAuth, NextAuthMiddlewareOptions } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { NextApiRequest } from 'next';

export default withAuth(
  function middleware(req: NextRequest & { nextauth: { token: any } }) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;
    const userRole = token?.role;

    // Si un utilisateur connecté essaie d'accéder à la page de login, le rediriger.
    if (token && pathname === '/login') {
      const url =
        userRole === 'PROFESSEUR'
          ? new URL('/teacher/dashboard', req.url)
          : new URL('/student/dashboard', req.url);
      return NextResponse.redirect(url);
    }
    
    // Protéger les routes enseignant
    if (pathname.startsWith('/teacher') && userRole !== 'PROFESSEUR') {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    
    // Protéger les routes élève
    if (pathname.startsWith('/student') && userRole !== 'ELEVE') {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ['/teacher/:path*', '/student/:path*', '/login'],
};
