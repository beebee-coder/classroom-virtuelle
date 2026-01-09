// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { Role, ValidationStatus } from '@prisma/client';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = request.nextUrl;

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isOnboardingRoute = pathname.startsWith('/student/onboarding');
  const isValidationPendingRoute = pathname.startsWith('/student/validation-pending');

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
        // CORRECTION : Différencier onboarding (pas de classe) et validation (classe mais pas validé)
        if (isNewUser) {
          return NextResponse.redirect(new URL('/student/onboarding', request.url));
        }
        if (validationStatus === ValidationStatus.PENDING) {
          return NextResponse.redirect(new URL('/student/validation-pending', request.url));
        }
        return NextResponse.redirect(new URL('/student/dashboard', request.url));
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

    // Gestion du flux élève
    if (role === Role.ELEVE) {
      // Élève validé essaie d'aller sur l'onboarding ou validation-pending
      if (validationStatus === ValidationStatus.VALIDATED && (isOnboardingRoute || isValidationPendingRoute)) {
        return NextResponse.redirect(new URL('/student/dashboard', request.url));
      }

      // Élève sans classe (nouvel utilisateur) n'est pas sur l'onboarding
      if (isNewUser && !isOnboardingRoute) {
        return NextResponse.redirect(new URL('/student/onboarding', request.url));
      }

      // Élève avec classe mais pas validé n'est pas sur validation-pending
      if (!isNewUser && validationStatus === ValidationStatus.PENDING && !isValidationPendingRoute) {
        return NextResponse.redirect(new URL('/student/validation-pending', request.url));
      }
    }
  } // <-- ACCOLADE FERMANTE AJOUTÉE ICI

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};