// src/app/register/page.tsx
import { checkOwnerAccountExists } from '@/lib/actions/teacher.actions';
import RegisterForm from './register-form';

export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  const ownerExists = await checkOwnerAccountExists();

  return <RegisterForm ownerExists={ownerExists} />;
}
