// src/app/login/page.tsx
import { Suspense } from 'react';
import LoginForm from './login-form';
import { Loader2 } from 'lucide-react';

function LoginFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin" />
    </div>
  );
}

export default function LoginPageContainer() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
