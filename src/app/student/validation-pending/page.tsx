// src/app/student/validation-pending/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Hourglass, UserCheck } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ValidationPendingPage() {
  const session = await getServerSession(authOptions);

  // 🔹 Redirige si non authentifié
  if (!session?.user) {
    redirect("/login");
  }

  // 🔹 Redirige si ce n'est pas un élève
  if (session.user.role !== "ELEVE") {
    redirect("/teacher/dashboard");
  }

  // 🔹 Redirige si déjà validé
  if (session.user.validationStatus === "VALIDATED") {
    redirect("/student/dashboard");
  }

  // 🔹 À ce stade : élève authentifié + PENDING
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <Card className="bg-card/80 backdrop-blur-sm border-white/20 shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-orange-100 rounded-full">
              <Hourglass className="h-8 w-8 text-orange-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Validation en cours</CardTitle>
            <CardDescription className="text-muted-foreground">
              Votre compte est en attente de validation par votre enseignant.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Vous recevrez un email (ou une notification dans l'application) dès que votre inscription sera approuvée.
            </p>
            <div className="bg-muted/50 p-3 rounded-md">
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                <UserCheck className="h-4 w-4" />
                Compte : <span className="font-mono">{session.user.email}</span>
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Besoin d'aide ? Contactez votre enseignant directement.
            </p>
            <Link
              href="/"
              className="inline-block mt-2 text-sm text-primary hover:underline"
            >
              ← Retour à l'accueil
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}