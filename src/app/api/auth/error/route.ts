// src/app/api/auth/error/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = new URL('/login', request.url);
  
  // Récupérer le type d'erreur depuis l'URL ou utiliser une valeur par défaut
  const errorType = request.nextUrl.searchParams.get('error') || 'CredentialsSignin';
  url.searchParams.set('error', errorType);
  
  return NextResponse.redirect(url);
}

export async function POST(request: NextRequest) {
  const url = new URL('/login', request.url);
  
  // Récupérer le type d'erreur depuis l'URL ou utiliser une valeur par défaut
  const errorType = request.nextUrl.searchParams.get('error') || 'CredentialsSignin';
  url.searchParams.set('error', errorType);
  
  return NextResponse.redirect(url);
}