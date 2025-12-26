// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken }  from 'next-auth/jwt';
import { Role, ValidationStatus } from '@prisma/client';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = request.nextUrl;

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');

  // Si pas de token et pas sur une route d'authentification
  if (!token && !isAuthRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Si token existe
  if (token) {
    const { role, isNewUser, validationStatus } = token;

    // Si sur une route d'authentification, rediriger vers le dashboard approprié
    if (isAuthRoute) {
      if (role === Role.PROFESSEUR) {
        return NextResponse.redirect(new URL('/teacher/dashboard', request.url));
      }
      if (role === Role.ELEVE) {
        const target = (isNewUser || validationStatus === ValidationStatus.PENDING) 
            ? '/student/onboarding' 
            : '/student/dashboard';
        return NextResponse.redirect(new URL(target, request.url));
      }
    }

    // Protection des routes enseignant
    if (pathname.startsWith('/teacher') && role !== Role.PROFESSEUR) {
      return NextResponse.redirect(new URL('/student/dashboard', request.url));
    }

    // Protection des routes élève
    if (pathname.startsWith('/student') && role !== Role.ELEVE) {
      return NextResponse.redirect(new URL('/teacher/dashboard', request.url));
    }
    
    // Élève validé essaie d'aller sur l'onboarding
    if (pathname.startsWith('/student/onboarding') && role === Role.ELEVE && !isNewUser && validationStatus !== ValidationStatus.PENDING) {
       return NextResponse.redirect(new URL('/student/dashboard', request.url));
    }

    // Nouvel élève ou élève en attente n'est pas sur la page d'onboarding
    if ((isNewUser || validationStatus === ValidationStatus.PENDING) && role === Role.ELEVE && !pathname.startsWith('/student/onboarding')) {
      return NextResponse.redirect(new URL('/student/onboarding', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Appliquer le middleware à toutes les routes SAUF :
     * - Celles qui commencent par /api/
     * - Celles qui commencent par /_next/static/
     * - Celles qui commencent par /_next/image/
     * - Le fichier favicon.ico
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
