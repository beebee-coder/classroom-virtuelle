// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// CE MIDDLEWARE EST SIMPLIFIÉ POUR ÉVITER LES CONFLITS D'EN-TÊTES
// AVEC LES ROUTES API DE NEXT-AUTH.
export function middleware(request: NextRequest) {
  // Pour le moment, ce middleware ne fait que passer la requête.
  // Vous pouvez y ajouter une logique plus complexe plus tard si nécessaire,
  // mais évitez d'interférer avec les routes /api.
  const response = NextResponse.next();
  return response;
}

export const config = {
  // Le matcher est ajusté pour ne PAS inclure les routes API par défaut.
  // Appliquez le middleware uniquement aux pages où c'est nécessaire.
  // matcher: [
  //   '/session/:path*',
  // ],
};
