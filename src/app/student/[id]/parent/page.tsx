// src/app/student/[id]/parent/page.tsx
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyRound } from 'lucide-react';
import { verifyParentPassword, getTasksForValidation } from '@/lib/actions/parent.actions';
import { TaskValidationClient } from './TaskValidationClient';
import { BackButton } from '@/components/BackButton';
import { Suspense } from 'react';
import prisma from '@/lib/prisma';
import type { Task } from '@prisma/client';

type ValidationTask = Task & { progressId: string };

export default async function ParentValidationPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { pw?: string };
}) {
  const session = await getServerSession(authOptions);
  const studentId = params.id;
  
  const student = await prisma.user.findUnique({
    where: { id: studentId, role: 'ELEVE' }
  });

  if (!student) {
    notFound();
  }

  const hasPasswordSet = !!student.parentPassword;
  
  const isAuthenticated = hasPasswordSet && searchParams.pw ? await verifyParentPassword(student.id, searchParams.pw) : false;
  
  let tasksForValidation: ValidationTask[] = [];
  if (isAuthenticated) {
    tasksForValidation = await getTasksForValidation(student.id);
  }

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
              <Suspense fallback={<div>Chargement...</div>}>
                 <TaskValidationClient
                    studentId={student.id}
                    studentName={student.name || 'l\'élève'}
                    initialTasksForValidation={tasksForValidation}
                    isAuthenticated={isAuthenticated}
                    hasPasswordSet={hasPasswordSet}
                  />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
