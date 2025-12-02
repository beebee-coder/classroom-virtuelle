// src/middleware.ts - VERSION CORRIGÉE
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Le middleware est conservé pour une utilisation future mais ne fait rien pour l'instant.
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

// AUCUNE ROUTE N'EST INTERCEPTÉE
// En spécifiant un matcher qui ne correspond à rien, nous évitons
// toute interférence avec les requêtes internes de Next.js.
export const config = {
  matcher: [],
};
