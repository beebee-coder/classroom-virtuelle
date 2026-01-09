// src/app/login/page.tsx
import LoginForm from './login-form';
import { checkOwnerAccountExists } from '@/lib/actions/teacher.actions';
import { getAuthSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  // Si l'utilisateur est déjà connecté, on le redirige immédiatement
  // Cela aide à prévenir les boucles si le middleware est complexe.
  const session = await getAuthSession();
  if (session?.user) {
    if (session.user.role === 'PROFESSEUR') {
      redirect('/teacher/dashboard');
    } else {
      // Redirige vers onboarding si nouveau, sinon dashboard
      const redirectTo = session.user.isNewUser ? '/student/onboarding' : '/student/dashboard';
      redirect(redirectTo);
    }
  }

  // Si non connecté, vérifier si le propriétaire existe pour afficher le bon formulaire
  const ownerExists = await checkOwnerAccountExists();

  return <LoginForm ownerExists={ownerExists} />;
}
