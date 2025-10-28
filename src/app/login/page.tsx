// src/app/login/page.tsx
import { Suspense } from 'react';
import LoginClient from '@/components/LoginClient';
import SessionLoading from '@/components/SessionLoading';

export default function LoginPage() {
  return (
    <Suspense fallback={<SessionLoading />}>
      <LoginClient />
    </Suspense>
  );
}
