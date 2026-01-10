// src/app/login/page.tsx
import LoginForm from './login-form';
import { checkOwnerAccountExists } from '@/lib/actions/teacher.actions';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  // La vérification de session et la redirection sont maintenant entièrement gérées par le middleware.
  // Cette page se charge uniquement si l'utilisateur n'est PAS connecté.
  
  // On vérifie seulement si le compte propriétaire existe pour afficher le bon formulaire.
  const ownerExists = await checkOwnerAccountExists();

  return <LoginForm ownerExists={ownerExists} />;
}
