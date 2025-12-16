// src/app/teacher/validations/page.tsx
import { BackButton } from "@/components/BackButton";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ValidationConsoleClient } from "./ValidationConsoleClient";
import { CheckCircle } from "lucide-react";
import prisma from "@/lib/prisma";
import type { User } from "@prisma/client";
import { ValidationStatus, Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function ProfessorValidationPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "PROFESSEUR") {
    redirect("/login");
  }

  // ✅ CORRECTION : Requête Prisma précise pour ne récupérer que les élèves en attente.
  const pendingStudents = await prisma.user.findMany({
    where: {
      validationStatus: ValidationStatus.PENDING,
      role: Role.ELEVE
    },
    orderBy: {
      createdAt: 'desc' // Les plus récents en premier
    }
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-w-0">
      <div className=" flex items-center gap-4 mb-8">
        <BackButton />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Console de Validation</h1>
          <p className="text-muted-foreground">Examinez et validez les élèves en attente.</p>
        </div>
      </div>

      <Card>
          <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                  <CheckCircle className="text-primary" />
                  Élèves en attente de validation
              </CardTitle>
              <CardDescription>
                  Validez les comptes des nouveaux élèves pour leur donner accès à la plateforme.
              </CardDescription>
          </CardHeader>
          <CardContent>
              <ValidationConsoleClient initialStudents={pendingStudents} />
          </CardContent>
      </Card>
    </div>
  );
}
