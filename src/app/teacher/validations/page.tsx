// src/app/teacher/validations/page.tsx
import { BackButton } from "@/components/BackButton";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import prisma from "@/lib/prisma";
import { ValidationConsoleClient } from "./ValidationConsoleClient";
import type { User, Classroom } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function ValidationsPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "PROFESSEUR") {
    redirect("/login");
  }

  // Récupérer la liste initiale des élèves en attente
  const pendingStudents = await prisma.user.findMany({
    where: {
      role: 'ELEVE',
      validationStatus: 'PENDING',
    },
    orderBy: {
      createdAt: 'asc' // Trier par date de création, les plus anciens en premier
    }
  });

  // Récupérer les classes du professeur pour le sélecteur d'assignation
  const teacherClasses = await prisma.classroom.findMany({
      where: { professeurId: session.user.id },
      select: { id: true, nom: true }
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-w-0">
      <div className=" flex items-center gap-4 mb-8">
        <BackButton />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Console de Validation</h1>
          <p className="text-muted-foreground">Validez les nouveaux élèves et les tâches soumises.</p>
        </div>
      </div>

      <Card>
          <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                  <CheckCircle className="text-primary" />
                  Élèves en attente d'approbation
              </CardTitle>
              <CardDescription>
                  Validez les nouveaux élèves et assignez-les à une de vos classes.
              </CardDescription>
          </CardHeader>
          <CardContent>
              {/* Le composant client gère l'affichage et les mises à jour temps réel */}
              <ValidationConsoleClient 
                initialPendingStudents={pendingStudents}
                teacherClasses={teacherClasses}
              />
          </CardContent>
      </Card>
    </div>
  );
}
