// src/app/api/auth/status/route.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        validationStatus: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Sécurité : Ne renvoyer le statut que pour les élèves
    if (user.role !== Role.ELEVE) {
      return NextResponse.json({ error: "Cette route est réservée aux élèves" }, { status: 403 });
    }

    return NextResponse.json({ validationStatus: user.validationStatus });
  } catch (error) {
    console.error("[API/STATUS] Erreur:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
