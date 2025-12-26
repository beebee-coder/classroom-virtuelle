// src/app/api/auth/status/route.ts
import { getAuthSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET() {
  console.log('[API/STATUS] 🔵 Requête GET reçue');
  try {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      console.log('[API/STATUS] ❌ Non autorisé (pas de session)');
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    console.log(`[API/STATUS] 🔵 Recherche du statut pour l'utilisateur: ${session.user.id}`);
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        validationStatus: true,
        role: true,
      },
    });

    if (!user) {
      console.log(`[API/STATUS] ❌ Utilisateur non trouvé: ${session.user.id}`);
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Sécurité : Ne renvoyer le statut que pour les élèves
    if (user.role !== Role.ELEVE) {
      console.log(`[API/STATUS] ❌ Accès refusé (pas un élève): Rôle ${user.role}`);
      return NextResponse.json({ error: "Cette route est réservée aux élèves" }, { status: 403 });
    }

    console.log(`[API/STATUS] ✅ Statut trouvé: ${user.validationStatus}`);
    return NextResponse.json({ validationStatus: user.validationStatus });
  } catch (error) {
    console.error("[API/STATUS] 💥 Erreur:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
