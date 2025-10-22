// src/app/student/[id]/parent/page.tsx
import { notFound } from 'next/navigation';
import { getAuthSession } from '@/lib/session';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { KeyRound, ShieldAlert } from 'lucide-react';
import { verifyParentPassword, getTasksForValidation } from '@/lib/actions/parent.actions';
import { TaskValidationClient } from './TaskValidationClient';
import { BackButton } from '@/components/BackButton';
import { Suspense } from 'react';

// DUMMY DATA
const dummyStudents: {[key: string]: { id: string, name: string, parentPassword?: string }} = {
    'student1': { id: 'student1', name: 'Alice', parentPassword: 'hashedpassword' }, // Simulate password is set
    'student2': { id: 'student2', name: 'Bob' }, // Simulate password is not set
}

export default async function ParentValidationPage({
  params,
  searchParams, // This is now safe to be passed down
}: {
  params: { id: string };
  searchParams: { pw?: string };
}) {
  const session = await getAuthSession();
  // ---=== BYPASS BACKEND ===---
  // The logic is simplified here. We just fetch the student and tasks.
  // The authentication logic is now fully handled in the client component.
  const student = dummyStudents['student1']; 
  const studentId = 'student1';
  // ---=========================---

  if (!student) {
    notFound();
  }

  const hasPasswordSet = !!student.parentPassword;
  
  // We still need to check auth server-side to decide if we should even load the tasks.
  const isAuthenticated = hasPasswordSet && searchParams.pw ? await verifyParentPassword(student.id, searchParams.pw) : false;
  const tasksForValidation = isAuthenticated ? await getTasksForValidation(student.id) : [];

  return (
    <>
      <Header user={session?.user} />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
             {/* The back button is useful if a parent gets here from the student dashboard */}
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
