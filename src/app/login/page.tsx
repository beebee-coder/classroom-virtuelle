// src/app/login/page.tsx
'use client'; // ✅ CORRECTION: Transformer en composant client

import LoginForm from './login-form';
import { Suspense } from 'react';

// Le Suspense est conservé au cas où, mais le composant est maintenant client
// pour assurer un chargement plus simple et éviter les ChunkLoadErrors.
export default function LoginPage() {
  return <LoginForm />;
}
