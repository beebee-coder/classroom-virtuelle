// src/app/student/[id]/parent/page.tsx
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getAuthSession } from '@/lib/session';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { KeyRound, ShieldAlert } from 'lucide-react';
import { verifyParentPassword, getTasksForValidation } from '@/lib/actions/parent.actions';
import { TaskValidationClient } from './TaskValidationClient';
import { BackButton } from '@/components/BackButton';

export default async function ParentValidationPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { pw?: string };
}) {
  const session = await getAuthSession();
  const student = await prisma.user.findUnique({
    where: { id: params.id, role: 'ELEVE' },
  });

  if (!student) {
    notFound();
  }

  const password = searchParams.pw;
  let isAuthenticated = false;
  let hasPasswordSet = false;
  
  if (student.parentPassword) {
      hasPasswordSet = true;
      if (password) {
          isAuthenticated = await verifyParentPassword(student.id, password);
      }
  }

  const tasksForValidation = isAuthenticated ? await getTasksForValidation(student.id) : [];

  return (
    <>
      <Header user={session?.user} />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <BackButton />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <KeyRound className="text-primary" />
                Espace de Validation Parental
              </CardTitle>
              <CardDescription>
                Validez les tâches accomplies par {student.name} et suivez sa progression.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(!hasPasswordSet || !isAuthenticated) && (
                <Alert variant="destructive" className="mb-6">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle>Accès Sécurisé</AlertTitle>
                  <AlertDescription>
                    {hasPasswordSet 
                      ? "Le mot de passe fourni est incorrect. Veuillez réessayer." 
                      : "Cet espace est protégé par un mot de passe. Veuillez en définir un pour continuer."}
                  </AlertDescription>
                </Alert>
              )}
              
              <TaskValidationClient
                studentId={student.id}
                studentName={student.name || 'l\'élève'}
                initialTasksForValidation={tasksForValidation}
                isAuthenticated={isAuthenticated}
                hasPasswordSet={hasPasswordSet}
              />

            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
